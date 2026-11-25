-- ============================================================================
-- CLASSY LUXE — Row Level Security & Storage
-- Principle: the public can READ the active catalogue only. Everything else is
-- admin-only. Orders are created exclusively by the server via place_order().
-- ============================================================================

alter table public.admins               enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.product_images       enable row level security;
alter table public.delivery_rates       enable row level security;
alter table public.customers            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_movements  enable row level security;

-- ---------------------------------------------------------------- admins ----
create policy "admins: read self or any if admin" on public.admins
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins: owner manages" on public.admins
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ------------------------------------------------------------- catalogue ----
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: public read active" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "variants: public read active" on public.product_variants
  for select to anon, authenticated using (
    public.is_admin() or (is_active and exists (
      select 1 from public.products p where p.id = product_id and p.is_active)));
create policy "variants: admin write" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "images: public read active" on public.product_images
  for select to anon, authenticated using (
    public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "images: admin write" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "delivery rates: public read" on public.delivery_rates
  for select to anon, authenticated using (true);
create policy "delivery rates: admin write" on public.delivery_rates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------ customers & orders --
-- No anon access at all. Admins read; orders are updated by admins (status via
-- set_order_status, which also handles stock). No delete policies: orders are
-- kept for accounting — cancel them instead.
create policy "customers: admin read" on public.customers
  for select to authenticated using (public.is_admin());
create policy "customers: admin update" on public.customers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "orders: admin read" on public.orders
  for select to authenticated using (public.is_admin());
create policy "orders: admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "order items: admin read" on public.order_items
  for select to authenticated using (public.is_admin());
create policy "status history: admin read" on public.order_status_history
  for select to authenticated using (public.is_admin());
create policy "inventory movements: admin read" on public.inventory_movements
  for select to authenticated using (public.is_admin());

-- Admins must not be able to rewrite money or status columns directly; those
-- change only through server-side functions.
revoke update on public.orders from authenticated;
grant update (delivery_fee_pesewas, admin_notes, payment_status) on public.orders to authenticated;

-- Keep total in step when an admin confirms a delivery fee.
create or replace function public.orders_recalc_total()
returns trigger language plpgsql as $$
begin
  new.total_pesewas = new.subtotal_pesewas + coalesce(new.delivery_fee_pesewas, 0);
  return new;
end $$;
create trigger t_orders_recalc before update of delivery_fee_pesewas on public.orders
  for each row execute function public.orders_recalc_total();

-- ---------------------------------------------------------------- storage ---
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "product images: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "product images: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
