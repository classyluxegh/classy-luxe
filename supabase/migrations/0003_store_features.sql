-- ============================================================================
-- CLASSY LUXE — roles, payments, reviews, store settings, featured products,
-- category images, customer addresses
-- ============================================================================

-- ------------------------------------------------------------ roles ---------
-- owner   : everything, incl. settings and team
-- manager : catalogue, orders, inventory, customers, reviews, settings
-- staff   : orders, inventory, customers (read)
alter table public.admins
  add column is_active    boolean not null default true,
  add column display_name text check (char_length(display_name) <= 80),
  add column invited_by   uuid references auth.users (id) on delete set null;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and is_active);
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and is_active and role in ('owner', 'manager'));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and is_active and role = 'owner');
$$;

-- Catalogue and delivery fees: managers and owners only
drop policy "categories: admin write" on public.categories;
drop policy "products: admin write" on public.products;
drop policy "variants: admin write" on public.product_variants;
drop policy "images: admin write" on public.product_images;
drop policy "delivery rates: admin write" on public.delivery_rates;
create policy "categories: manager write" on public.categories for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "products: manager write" on public.products for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "images: manager write" on public.product_images for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "delivery rates: manager write" on public.delivery_rates for all to authenticated using (public.is_manager()) with check (public.is_manager());
-- Variants: managers edit everything; staff change stock through adjust_stock()
create policy "variants: manager write" on public.product_variants for all to authenticated using (public.is_manager()) with check (public.is_manager());

drop policy "product images: admin upload" on storage.objects;
drop policy "product images: admin update" on storage.objects;
drop policy "product images: admin delete" on storage.objects;
create policy "product images: manager upload" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_manager());
create policy "product images: manager update" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_manager());
create policy "product images: manager delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_manager());

-- The owner can't lock themselves out
create or replace function public.protect_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner' and old.is_active)
     or (tg_op = 'UPDATE' and old.role = 'owner' and old.is_active and (new.role <> 'owner' or not new.is_active)) then
    if (select count(*) from public.admins where role = 'owner' and is_active and user_id <> old.user_id) = 0 then
      raise exception 'LAST_OWNER';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger t_admins_last_owner before update or delete on public.admins
  for each row execute function public.protect_last_owner();

-- ------------------------------------------------------ catalogue extras ----
alter table public.products   add column is_featured boolean not null default false;
alter table public.categories add column image_url text, add column is_active boolean not null default true;
create index products_created_idx on public.products (created_at desc);

drop policy "categories: public read" on public.categories;
create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());

-- ------------------------------------------------------------ customers -----
alter table public.customers
  add column last_region   text,
  add column last_location text check (char_length(last_location) <= 300);

-- ------------------------------------------------------------- payments -----
create type public.payment_provider as enum ('paystack', 'manual');
create type public.payment_record_status as enum ('pending', 'success', 'failed', 'abandoned', 'refunded');

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete restrict,
  provider       public.payment_provider not null,
  reference      text unique,
  amount_pesewas int not null check (amount_pesewas >= 0),
  currency       text not null default 'GHS',
  channel        text,          -- mobile_money, card, bank, cash …
  status         public.payment_record_status not null default 'pending',
  verified_at    timestamptz,
  verification   jsonb,         -- trimmed provider response, for audit
  note           text,
  recorded_by    uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create trigger t_payments_updated before update on public.payments for each row execute function public.touch_updated_at();
alter table public.payments enable row level security;
create policy "payments: admin read" on public.payments for select to authenticated using (public.is_admin());

-- Paystack: create the pending payment row together with the reference
create or replace function public.set_paystack_reference(p_order uuid, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_total int;
begin
  update public.orders set paystack_reference = p_reference
   where id = p_order and payment_method = 'paystack'
  returning total_pesewas into v_total;
  if not found then raise exception 'NOT_FOUND'; end if;
  insert into public.payments (order_id, provider, reference, amount_pesewas, status)
  values (p_order, 'paystack', p_reference, v_total, 'pending');
end $$;

drop function public.mark_order_paid(text, int);
create or replace function public.mark_order_paid(p_reference text, p_amount int, p_channel text default null, p_verification jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where paystack_reference = p_reference for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_order.payment_status = 'paid' then return 'ALREADY_PAID'; end if;
  if v_order.total_pesewas <> p_amount then
    update public.payments set status = 'failed', verification = p_verification, verified_at = now(),
           note = 'Amount mismatch: expected ' || v_order.total_pesewas || ', got ' || p_amount
     where reference = p_reference;
    update public.orders set payment_status = 'failed' where id = v_order.id;
    return 'AMOUNT_MISMATCH';
  end if;
  update public.payments set status = 'success', channel = p_channel, verification = p_verification, verified_at = now()
   where reference = p_reference;
  update public.orders
     set payment_status = 'paid',
         status = case when status = 'pending' then 'confirmed'::public.order_status else status end
   where id = v_order.id;
  insert into public.order_status_history (order_id, status, note) values (v_order.id, 'confirmed', 'Paystack payment verified');
  return 'PAID';
end $$;

create or replace function public.mark_payment_failed(p_reference text, p_status public.payment_record_status, p_verification jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('failed', 'abandoned') then raise exception 'INVALID_STATUS'; end if;
  update public.payments set status = p_status, verification = p_verification, verified_at = now()
   where reference = p_reference and status = 'pending';
  update public.orders set payment_status = 'failed'
   where paystack_reference = p_reference and payment_status = 'pending';
end $$;

-- Admin records a payment received outside Paystack (e.g. MoMo sent on WhatsApp)
create or replace function public.record_manual_payment(p_order uuid, p_amount int, p_channel text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_paid int;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if;
  if p_amount <= 0 or p_amount > 100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if p_channel not in ('mobile_money', 'cash', 'bank', 'card') then raise exception 'INVALID_CHANNEL'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.status = 'cancelled' then raise exception 'ORDER_CANCELLED'; end if;
  insert into public.payments (order_id, provider, amount_pesewas, channel, status, verified_at, note, recorded_by)
  values (p_order, 'manual', p_amount, p_channel, 'success', now(), nullif(p_note, ''), auth.uid());
  select coalesce(sum(amount_pesewas), 0) into v_paid from public.payments where order_id = p_order and status = 'success';
  update public.orders set payment_status = case when v_paid >= v_order.total_pesewas then 'paid'::public.payment_status else v_order.payment_status end
   where id = p_order;
end $$;

revoke execute on function public.set_paystack_reference(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, int, text, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_payment_failed(text, public.payment_record_status, jsonb) from public, anon, authenticated;
grant execute on function public.set_paystack_reference(uuid, text) to service_role;
grant execute on function public.mark_order_paid(text, int, text, jsonb) to service_role;
grant execute on function public.mark_payment_failed(text, public.payment_record_status, jsonb) to service_role;
revoke execute on function public.record_manual_payment(uuid, int, text, text) from public, anon;
grant execute on function public.record_manual_payment(uuid, int, text, text) to authenticated;

-- Admins may no longer set payment_status by hand: payments go through
-- Paystack verification or record_manual_payment(). Refunds are the exception.
revoke update on public.orders from authenticated;
grant update (delivery_fee_pesewas, admin_notes) on public.orders to authenticated;

create or replace function public.mark_order_refunded(p_order uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_manager() then raise exception 'NOT_AUTHORISED'; end if;
  update public.orders set payment_status = 'refunded' where id = p_order and payment_status = 'paid';
  if not found then raise exception 'NOT_PAID'; end if;
  update public.payments set status = 'refunded', note = coalesce(nullif(p_note, ''), note) where order_id = p_order and status = 'success';
end $$;
revoke execute on function public.mark_order_refunded(uuid, text) from public, anon;
grant execute on function public.mark_order_refunded(uuid, text) to authenticated;

-- --------------------------------------------------------------- reviews ----
create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  order_id      uuid references public.orders (id) on delete set null,
  customer_id   uuid references public.customers (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 60),
  rating        int not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 10 and 1500),
  status        public.review_status not null default 'pending',
  moderated_by  uuid references auth.users (id) on delete set null,
  moderated_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (order_id, product_id)  -- one review per product per order
);
create index reviews_product_idx on public.reviews (product_id, status, created_at desc);
alter table public.reviews enable row level security;

-- Public sees approved reviews only, and only non-identifying columns
create policy "reviews: public read approved" on public.reviews
  for select to anon, authenticated using (status = 'approved' or public.is_admin());
create policy "reviews: manager moderate" on public.reviews
  for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "reviews: manager delete" on public.reviews
  for delete to authenticated using (public.is_manager());
revoke select on public.reviews from anon;
grant select (id, product_id, customer_name, rating, body, status, created_at) on public.reviews to anon;

-- Reviews come only from real customers: order number + the phone used on that
-- order, the order must be delivered and must contain the product.
create or replace function public.submit_review(p_order_number text, p_phone text, p_product_slug text,
                                                p_name text, p_rating int, p_body text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_product uuid;
begin
  if not coalesce((select reviews_enabled from public.store_settings where id), false) then return 'DISABLED'; end if;
  select * into v_order from public.orders where order_number = upper(trim(p_order_number));
  -- compare the last 9 digits so 024…, 24… and +233 24… all match
  if not found or right(regexp_replace(v_order.customer_phone, '\D', '', 'g'), 9) <> right(regexp_replace(p_phone, '\D', '', 'g'), 9)
     or length(regexp_replace(p_phone, '\D', '', 'g')) < 9 then
    return 'NOT_VERIFIED';
  end if;
  if v_order.status <> 'delivered' then return 'NOT_DELIVERED'; end if;
  select p.id into v_product from public.products p
    join public.order_items oi on oi.product_id = p.id and oi.order_id = v_order.id
   where p.slug = p_product_slug limit 1;
  if v_product is null then return 'NOT_PURCHASED'; end if;
  insert into public.reviews (product_id, order_id, customer_id, customer_name, rating, body)
  values (v_product, v_order.id, v_order.customer_id, p_name, p_rating, p_body)
  on conflict (order_id, product_id) do nothing;
  if not found then return 'ALREADY_REVIEWED'; end if;
  return 'SUBMITTED';
end $$;

-- ------------------------------------------------------- store settings -----
create table public.store_settings (
  id                  boolean primary key default true check (id),  -- single row
  business_name       text not null default 'Classy Luxe',
  tagline             text not null default 'The Scent of Elegance',
  whatsapp_number     text not null check (whatsapp_number ~ '^[0-9]{9,15}$'), -- international, digits only
  whatsapp_display    text not null,
  phone_number        text,
  phone_display       text,
  email               text,
  instagram_url       text,
  instagram_handle    text,
  snapchat_handle     text,
  tiktok_url          text,
  facebook_url        text,
  address_line1       text,
  address_line2       text,
  business_hours      text,
  business_hours_short text,
  delivery_info       text,       -- shown on the site, e.g. "Estimated 1–3 business days"
  student_delivery_info text,
  about_text          text,
  privacy_policy      text,
  terms_conditions    text,
  returns_policy      text,
  reviews_enabled     boolean not null default true,
  low_stock_threshold int not null default 3 check (low_stock_threshold between 0 and 1000),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null
);
create trigger t_settings_updated before update on public.store_settings for each row execute function public.touch_updated_at();
alter table public.store_settings enable row level security;
create policy "settings: public read" on public.store_settings for select to anon, authenticated using (true);
create policy "settings: manager update" on public.store_settings for update to authenticated using (public.is_manager()) with check (public.is_manager());

revoke execute on function public.submit_review(text, text, text, text, int, text) from public, anon, authenticated;
grant execute on function public.submit_review(text, text, text, text, int, text) to service_role;

-- -------------------------------------------- place_order: save address -----
create or replace function public.remember_customer_address()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.customers set last_region = new.region, last_location = new.location where id = new.customer_id;
  return new;
end $$;
create trigger t_orders_remember_address after insert on public.orders
  for each row execute function public.remember_customer_address();

-- ------------------------------------------------ dashboard summary v2 ------
create or replace function public.admin_sales_summary(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  v_low int := coalesce((select low_stock_threshold from public.store_settings where id), 3);
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if;
  return jsonb_build_object(
    'orders',           (select count(*) from public.orders where created_at >= v_since),
    'orders_open',      (select count(*) from public.orders where status in ('pending','confirmed','processing','ready_for_delivery','out_for_delivery')),
    'orders_pending',   (select count(*) from public.orders where status = 'pending'),
    'orders_completed', (select count(*) from public.orders where status = 'delivered' and created_at >= v_since),
    'products_total',   (select count(*) from public.products),
    'products_active',  (select count(*) from public.products where is_active),
    'customers_total',  (select count(*) from public.customers),
    'reviews_pending',  (select count(*) from public.reviews where status = 'pending'),
    'revenue_pesewas',  (select coalesce(sum(total_pesewas), 0) from public.orders
                          where created_at >= v_since and status <> 'cancelled' and payment_status = 'paid'),
    'pipeline_pesewas', (select coalesce(sum(total_pesewas), 0) from public.orders
                          where status in ('pending','confirmed','processing','ready_for_delivery','out_for_delivery')
                            and payment_status not in ('paid', 'refunded')),
    'by_status',        (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                           from (select status, count(*) n from public.orders where created_at >= v_since group by status) s),
    'daily',            (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'orders', coalesce(o.n, 0), 'sales_pesewas', coalesce(o.s, 0)) order by d), '[]'::jsonb)
                           from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
                           left join (select date_trunc('day', created_at) as order_day, count(*) n, sum(subtotal_pesewas) s
                                        from public.orders where status <> 'cancelled' group by 1) o on o.order_day = d),
    'top_products',     (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                           select oi.product_name as name, sum(oi.quantity)::int as units, sum(oi.line_total_pesewas)::int as sales_pesewas
                             from public.order_items oi join public.orders o on o.id = oi.order_id
                            where o.created_at >= v_since and o.status <> 'cancelled'
                            group by oi.product_name order by units desc limit 5) t),
    'low_stock',        (select coalesce(jsonb_agg(l), '[]'::jsonb) from (
                           select p.id as product_id, p.name, v.label, v.stock from public.product_variants v
                             join public.products p on p.id = v.product_id
                            where v.track_inventory and v.is_active and p.is_active and v.stock <= v_low
                            order by v.stock limit 10) l),
    'low_stock_threshold', v_low
  );
end $$;

-- Customer list with order stats for admins (respects is_admin)
create or replace view public.customer_stats with (security_invoker = true) as
  select c.id, c.full_name, c.phone, c.email, c.last_region, c.last_location, c.created_at,
         count(o.id) filter (where o.status <> 'cancelled')                                   as orders_count,
         coalesce(sum(o.total_pesewas) filter (where o.payment_status = 'paid'), 0)::int        as paid_pesewas,
         max(o.created_at)                                                                     as last_order_at
    from public.customers c
    left join public.orders o on o.customer_id = c.id
   group by c.id;
revoke all on public.customer_stats from anon;
grant select on public.customer_stats to authenticated;
