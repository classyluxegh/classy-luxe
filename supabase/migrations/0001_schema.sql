-- ============================================================================
-- CLASSY LUXE — database schema
-- Money is stored as integer pesewas (GH₵ 1 = 100 pesewas) to avoid rounding.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ----
create type public.collection_type as enum ('student', 'general');
create type public.product_badge  as enum ('Bestseller', 'New Arrival', 'Popular');
create type public.order_status   as enum ('pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('whatsapp', 'paystack');
create type public.delivery_option as enum ('gctu', 'accra', 'region');
create type public.admin_role     as enum ('owner', 'manager', 'staff');

-- ------------------------------------------------------------- helpers -----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------- administrators -
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.admin_role not null default 'staff',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;

-- ------------------------------------------------------------- catalogue ---
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 1 and 120),
  variant_label text check (char_length(variant_label) <= 80),
  collection    public.collection_type not null,
  category_id   uuid not null references public.categories (id) on delete restrict,
  description   text check (char_length(description) <= 2000),
  notes         text[] not null default '{}',
  badge         public.product_badge,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active, collection);

-- Sizes / variants carry the price and the inventory.
create table public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  label           text not null default '' check (char_length(label) <= 40),   -- e.g. '50ml'
  price_pesewas   int  not null check (price_pesewas >= 0),
  sku             text unique,
  track_inventory boolean not null default false,  -- false = always available
  stock           int not null default 0 check (stock >= 0),
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  url          text not null,
  storage_path text,          -- set when stored in Supabase Storage
  alt          text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index images_product_idx on public.product_images (product_id, sort_order);

-- ------------------------------------------------------------- delivery ----
create table public.delivery_rates (
  id          uuid primary key default gen_random_uuid(),
  option      public.delivery_option not null,
  region      text,                      -- for option = 'region'
  fee_pesewas int check (fee_pesewas >= 0), -- null = confirmed on WhatsApp
  updated_at  timestamptz not null default now(),
  unique nulls not distinct (option, region)
);

-- -------------------------------------------------------- customers/orders -
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete set null, -- for future customer accounts
  full_name  text not null check (char_length(full_name) between 1 and 120),
  phone      text not null unique check (phone ~ '^\+?[0-9]{9,15}$'),
  email      text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.order_number_seq start 1001;

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique default ('CL-' || nextval('public.order_number_seq')::text),
  customer_id          uuid references public.customers (id) on delete set null,
  customer_name        text not null,
  customer_phone       text not null,
  status               public.order_status   not null default 'pending',
  payment_status       public.payment_status not null default 'unpaid',
  payment_method       public.payment_method not null default 'whatsapp',
  paystack_reference   text unique,
  subtotal_pesewas     int not null check (subtotal_pesewas >= 0),
  delivery_fee_pesewas int check (delivery_fee_pesewas >= 0), -- null = to be confirmed
  total_pesewas        int not null check (total_pesewas >= 0),
  delivery_option      public.delivery_option not null,
  region               text not null,
  location             text not null check (char_length(location) <= 300),
  notes                text check (char_length(notes) <= 1000),
  admin_notes          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  product_id         uuid references public.products (id) on delete set null,
  variant_id         uuid references public.product_variants (id) on delete set null,
  product_name       text not null,          -- snapshot at time of order
  variant_label      text not null default '',
  collection         public.collection_type,
  unit_price_pesewas int not null check (unit_price_pesewas >= 0),
  quantity           int not null check (quantity between 1 and 50),
  line_total_pesewas int not null check (line_total_pesewas >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  note       text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id         bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  change     int not null,
  reason     text not null check (reason in ('order', 'order_cancelled', 'restock', 'adjustment')),
  order_id   uuid references public.orders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create trigger t_categories_updated before update on public.categories       for each row execute function public.touch_updated_at();
create trigger t_products_updated   before update on public.products         for each row execute function public.touch_updated_at();
create trigger t_variants_updated   before update on public.product_variants for each row execute function public.touch_updated_at();
create trigger t_customers_updated  before update on public.customers        for each row execute function public.touch_updated_at();
create trigger t_orders_updated     before update on public.orders           for each row execute function public.touch_updated_at();
create trigger t_rates_updated      before update on public.delivery_rates   for each row execute function public.touch_updated_at();

-- ============================================================================
-- Business logic (runs inside the database, so prices and stock can never be
-- set by the browser)
-- ============================================================================

-- Creates an order from variant ids + quantities. Prices come from the DB.
-- Only callable by the server (service role) — see grants below.
create or replace function public.place_order(
  p_name text, p_phone text, p_delivery public.delivery_option, p_region text,
  p_location text, p_notes text, p_payment public.payment_method, p_items jsonb
) returns table (order_id uuid, order_number text, subtotal_pesewas int, delivery_fee_pesewas int, total_pesewas int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_customer uuid;
  v_order    uuid;
  v_number   text;
  v_subtotal int := 0;
  v_fee      int;
  v_item     jsonb;
  v_qty      int;
  v_row      record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'INVALID_ITEMS';
  end if;

  -- delivery fee from configured rates (null = confirm on WhatsApp)
  select dr.fee_pesewas into v_fee from public.delivery_rates dr
   where dr.option = p_delivery
     and (p_delivery <> 'region' or dr.region = p_region)
   limit 1;
  if p_delivery = 'gctu' then v_fee := coalesce(v_fee, 0); end if;
  if p_payment = 'paystack' and v_fee is null then
    raise exception 'DELIVERY_FEE_UNKNOWN';
  end if;

  insert into public.customers (full_name, phone)
  values (p_name, p_phone)
  on conflict (phone) do update set full_name = excluded.full_name
  returning id into v_customer;

  insert into public.orders (customer_id, customer_name, customer_phone, payment_method,
                             payment_status, subtotal_pesewas, delivery_fee_pesewas, total_pesewas,
                             delivery_option, region, location, notes)
  values (v_customer, p_name, p_phone, p_payment,
          case when p_payment = 'paystack' then 'pending'::public.payment_status else 'unpaid'::public.payment_status end,
          0, v_fee, 0, p_delivery, p_region, p_location, nullif(p_notes, ''))
  returning id, orders.order_number into v_order, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'INVALID_QUANTITY'; end if;

    select v.id, v.label, v.price_pesewas, v.track_inventory, v.stock, p.id as product_id,
           p.name, p.variant_label, p.collection
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid and v.is_active and p.is_active
       for update of v;

    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_row.track_inventory then
      if v_row.stock < v_qty then raise exception 'OUT_OF_STOCK:%', v_row.name; end if;
      update public.product_variants set stock = stock - v_qty where id = v_row.id;
      insert into public.inventory_movements (variant_id, change, reason, order_id)
      values (v_row.id, -v_qty, 'order', v_order);
    end if;

    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_label,
                                    collection, unit_price_pesewas, quantity, line_total_pesewas)
    values (v_order, v_row.product_id, v_row.id,
            v_row.name || coalesce(' — ' || v_row.variant_label, ''), v_row.label,
            v_row.collection, v_row.price_pesewas, v_qty, v_row.price_pesewas * v_qty);

    v_subtotal := v_subtotal + v_row.price_pesewas * v_qty;
  end loop;

  update public.orders
     set subtotal_pesewas = v_subtotal, total_pesewas = v_subtotal + coalesce(v_fee, 0)
   where id = v_order;

  insert into public.order_status_history (order_id, status, note) values (v_order, 'pending', 'Order placed online');

  return query select v_order, v_number, v_subtotal, v_fee, v_subtotal + coalesce(v_fee, 0);
end $$;

-- Attach a Paystack reference to an order (server only).
create or replace function public.set_paystack_reference(p_order uuid, p_reference text)
returns void language sql security definer set search_path = '' as $$
  update public.orders set paystack_reference = p_reference where id = p_order and payment_method = 'paystack';
$$;

-- Marks a Paystack order paid after server-side verification. Idempotent.
create or replace function public.mark_order_paid(p_reference text, p_amount int)
returns text language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where paystack_reference = p_reference for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_order.payment_status = 'paid' then return 'ALREADY_PAID'; end if;
  if v_order.total_pesewas <> p_amount then
    update public.orders set payment_status = 'failed', admin_notes = coalesce(admin_notes || E'\n', '') || 'Paystack amount mismatch: ' || p_amount where id = v_order.id;
    return 'AMOUNT_MISMATCH';
  end if;
  update public.orders
     set payment_status = 'paid',
         status = case when status = 'pending' then 'confirmed'::public.order_status else status end
   where id = v_order.id;
  insert into public.order_status_history (order_id, status, note) values (v_order.id, 'confirmed', 'Paystack payment verified');
  return 'PAID';
end $$;

-- Admin: change an order's status. Cancelling returns tracked stock.
create or replace function public.set_order_status(p_order uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_prev public.order_status; v_item record;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if;
  select status into v_prev from public.orders where id = p_order for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_prev = p_status then return; end if;
  if v_prev = 'cancelled' then raise exception 'ORDER_CANCELLED'; end if;

  if p_status = 'cancelled' then
    for v_item in
      select oi.variant_id, oi.quantity from public.order_items oi
        join public.product_variants v on v.id = oi.variant_id
       where oi.order_id = p_order and v.track_inventory
    loop
      update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      insert into public.inventory_movements (variant_id, change, reason, order_id, created_by)
      values (v_item.variant_id, v_item.quantity, 'order_cancelled', p_order, auth.uid());
    end loop;
  end if;

  update public.orders set status = p_status where id = p_order;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (p_order, p_status, nullif(p_note, ''), auth.uid());
end $$;

-- Admin: set stock for a variant and log the movement.
create or replace function public.adjust_stock(p_variant uuid, p_new_stock int, p_track boolean, p_reason text default 'adjustment')
returns void language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if;
  if p_new_stock < 0 or p_new_stock > 100000 then raise exception 'INVALID_STOCK'; end if;
  if p_reason not in ('restock', 'adjustment') then raise exception 'INVALID_REASON'; end if;
  select stock into v_old from public.product_variants where id = p_variant for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.product_variants set stock = p_new_stock, track_inventory = p_track where id = p_variant;
  if p_new_stock <> v_old then
    insert into public.inventory_movements (variant_id, change, reason, created_by)
    values (p_variant, p_new_stock - v_old, p_reason, auth.uid());
  end if;
end $$;

-- Admin: sales summary for the dashboard.
create or replace function public.admin_sales_summary(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if;
  return jsonb_build_object(
    'orders',          (select count(*) from public.orders where created_at >= v_since),
    'orders_open',     (select count(*) from public.orders where status in ('pending','confirmed','processing','ready_for_delivery','out_for_delivery')),
    'orders_pending',  (select count(*) from public.orders where status = 'pending'),
    'revenue_pesewas', (select coalesce(sum(total_pesewas), 0) from public.orders
                         where created_at >= v_since and status <> 'cancelled'
                           and (payment_status = 'paid' or status = 'delivered')),
    'pipeline_pesewas',(select coalesce(sum(subtotal_pesewas), 0) from public.orders
                         where created_at >= v_since and status in ('pending','confirmed','processing','ready_for_delivery','out_for_delivery')
                           and payment_status <> 'paid'),
    'by_status',       (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                          from (select status, count(*) n from public.orders where created_at >= v_since group by status) s),
    'daily',           (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'orders', coalesce(o.n, 0), 'sales_pesewas', coalesce(o.s, 0)) order by d), '[]'::jsonb)
                          from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
                          left join (select date_trunc('day', created_at) as order_day, count(*) n, sum(subtotal_pesewas) s
                                       from public.orders where status <> 'cancelled' group by 1) o on o.order_day = d),
    'top_products',    (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                          select oi.product_name as name, sum(oi.quantity)::int as units, sum(oi.line_total_pesewas)::int as sales_pesewas
                            from public.order_items oi join public.orders o on o.id = oi.order_id
                           where o.created_at >= v_since and o.status <> 'cancelled'
                           group by oi.product_name order by units desc limit 5) t),
    'low_stock',       (select coalesce(jsonb_agg(l), '[]'::jsonb) from (
                          select p.name, v.label, v.stock from public.product_variants v
                            join public.products p on p.id = v.product_id
                           where v.track_inventory and v.is_active and p.is_active and v.stock <= 3
                           order by v.stock limit 8) l)
  );
end $$;

-- ============================================================================
-- Grants: business functions are not callable from the browser
-- ============================================================================
revoke execute on function public.place_order(text, text, public.delivery_option, text, text, text, public.payment_method, jsonb) from public, anon, authenticated;
revoke execute on function public.set_paystack_reference(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, int) from public, anon, authenticated;
grant  execute on function public.place_order(text, text, public.delivery_option, text, text, text, public.payment_method, jsonb) to service_role;
grant  execute on function public.set_paystack_reference(uuid, text) to service_role;
grant  execute on function public.mark_order_paid(text, int) to service_role;

revoke execute on function public.set_order_status(uuid, public.order_status, text) from public, anon;
revoke execute on function public.adjust_stock(uuid, int, boolean, text) from public, anon;
revoke execute on function public.admin_sales_summary(int) from public, anon;
grant  execute on function public.set_order_status(uuid, public.order_status, text) to authenticated;
grant  execute on function public.adjust_stock(uuid, int, boolean, text) to authenticated;
grant  execute on function public.admin_sales_summary(int) to authenticated;
