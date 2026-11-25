-- ============================================================================
-- CLASSY LUXE — table privileges
-- Newer Supabase projects no longer grant table access to the API roles
-- automatically. Row Level Security (0002/0003) still decides WHICH rows each
-- role can see or change; these grants only allow the role to reach the table.
-- Safe to run more than once.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Helper functions used inside RLS policies must be callable by every role
grant execute on function public.is_admin(), public.is_manager(), public.is_owner() to anon, authenticated, service_role;

-- ---------------------------------------------------------- public catalogue
grant select on public.categories, public.products, public.product_variants, public.product_images,
                public.delivery_rates, public.store_settings
  to anon, authenticated;
-- approved reviews: only non-identifying columns for visitors (see 0003)
grant select (id, product_id, customer_name, rating, body, status, created_at) on public.reviews to anon;

-- ------------------------------------------------- signed-in admins (via RLS)
grant insert, update, delete on public.categories, public.products, public.product_variants,
                                public.product_images, public.delivery_rates
  to authenticated;
grant update on public.store_settings to authenticated;
grant select, insert, update, delete on public.admins to authenticated;
grant select on public.customers, public.orders, public.order_items, public.order_status_history,
                public.inventory_movements, public.payments, public.reviews
  to authenticated;
grant update on public.customers to authenticated;
grant update, delete on public.reviews to authenticated;
-- orders: only these columns may be edited directly; everything else goes
-- through set_order_status / record_manual_payment / mark_order_refunded
grant update (delivery_fee_pesewas, admin_notes) on public.orders to authenticated;
grant select on public.customer_stats to authenticated;

-- --------------------------------------------- server (service role) only
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
