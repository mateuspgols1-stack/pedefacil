-- ============================================================
-- PedidoFácil — 0001 schema
-- Execute este arquivo no SQL Editor do Supabase (nesta ordem:
-- 0001, 0002, 0003, 0004).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- perfis (1:1 com auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'owner' check (role in ('superadmin', 'owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------- planos comercializados ----------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  max_products integer,
  max_categories integer,
  max_units integer not null default 1,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- estabelecimentos (tenants) ----------
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$'),
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  address text,
  city text,
  primary_color text not null default '#ea580c',
  status text not null default 'active' check (status in ('active', 'blocked', 'pending')),
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  estimated_delivery_minutes integer not null default 45,
  estimated_pickup_minutes integer not null default 20,
  payment_methods text[] not null default array['pix', 'cash', 'card'],
  is_open_override boolean,
  plan_id uuid references public.plans (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists establishments_owner_idx on public.establishments (owner_id);
create index if not exists establishments_status_idx on public.establishments (status);

-- ---------- vínculo usuário <-> estabelecimento ----------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (establishment_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);

-- ---------- assinaturas ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_establishment_idx on public.subscriptions (establishment_id);

-- ---------- categorias ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists categories_establishment_idx on public.categories (establishment_id);

-- ---------- produtos ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  promo_price_cents integer check (promo_price_cents is null or promo_price_cents >= 0),
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_establishment_idx on public.products (establishment_id);
create index if not exists products_category_idx on public.products (category_id);

-- ---------- clientes do estabelecimento ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address text,
  notes text,
  orders_count integer not null default 0,
  total_spent_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (establishment_id, phone)
);
create index if not exists customers_establishment_idx on public.customers (establishment_id);

-- ---------- cupons ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (establishment_id, code)
);

-- ---------- horários de funcionamento ----------
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  unique (establishment_id, weekday)
);

-- ---------- pedidos ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  code text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  address text,
  notes text,
  payment_method text not null check (payment_method in ('pix', 'cash', 'card', 'online')),
  change_for_cents integer,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null check (total_cents >= 0),
  coupon_code text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_establishment_idx on public.orders (establishment_id, created_at desc);
create index if not exists orders_status_idx on public.orders (establishment_id, status);
create index if not exists orders_code_idx on public.orders (code);

-- ---------- itens do pedido (snapshot do produto) ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  total_cents integer not null check (total_cents >= 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- triggers utilitários ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists establishments_touch on public.establishments;
create trigger establishments_touch
  before update on public.establishments
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- cria o perfil automaticamente quando um usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
