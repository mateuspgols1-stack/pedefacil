-- ============================================================
-- PedidoFácil — 0002 segurança (RLS)
-- Cada estabelecimento só enxerga os próprios dados.
-- ============================================================

-- ---------- helpers (security definer: rodam como owner,
--            portanto não entram em recursão de RLS) ----------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

create or replace function public.is_establishment_member(p_establishment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.establishment_id = p_establishment_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_establishment_owner(p_establishment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.establishment_id = p_establishment_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.has_establishment_access(p_establishment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or public.is_establishment_member(p_establishment_id);
$$;

grant execute on function public.is_superadmin() to authenticated, anon;
grant execute on function public.is_establishment_member(uuid) to authenticated;
grant execute on function public.is_establishment_owner(uuid) to authenticated;
grant execute on function public.has_establishment_access(uuid) to authenticated;

-- habilita RLS em tudo
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.establishments enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.coupons enable row level security;
alter table public.business_hours enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_superadmin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ---------- plans (catálogo público, escrita só do superadmin) ----------
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to anon, authenticated
  using (is_active or public.is_superadmin());

drop policy if exists plans_write on public.plans;
create policy plans_write on public.plans
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ---------- establishments ----------
drop policy if exists establishments_select on public.establishments;
create policy establishments_select on public.establishments
  for select to authenticated
  using (public.has_establishment_access(id) or owner_id = auth.uid());

drop policy if exists establishments_insert on public.establishments;
create policy establishments_insert on public.establishments
  for insert to authenticated
  with check (owner_id = auth.uid() or public.is_superadmin());

drop policy if exists establishments_update on public.establishments;
create policy establishments_update on public.establishments
  for update to authenticated
  using (public.is_establishment_owner(id) or public.is_superadmin())
  with check (public.is_establishment_owner(id) or public.is_superadmin());

drop policy if exists establishments_delete on public.establishments;
create policy establishments_delete on public.establishments
  for delete to authenticated
  using (public.is_superadmin());

-- ---------- memberships ----------
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or public.has_establishment_access(establishment_id));

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.establishments e
        where e.id = establishment_id and e.owner_id = auth.uid()
      )
    )
  );

drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships
  for update to authenticated
  using (public.is_superadmin() or public.is_establishment_owner(establishment_id))
  with check (public.is_superadmin() or public.is_establishment_owner(establishment_id));

drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.is_superadmin() or public.is_establishment_owner(establishment_id));

-- ---------- subscriptions ----------
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.has_establishment_access(establishment_id));

drop policy if exists subscriptions_write on public.subscriptions;
create policy subscriptions_write on public.subscriptions
  for all to authenticated
  using (public.is_superadmin() or public.is_establishment_owner(establishment_id))
  with check (public.is_superadmin() or public.is_establishment_owner(establishment_id));

-- ---------- tabelas com establishment_id ----------
-- categorias
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to anon, authenticated
  using (
    public.has_establishment_access(establishment_id)
    or exists (
      select 1 from public.establishments e
      where e.id = categories.establishment_id and e.status = 'active'
    )
  );

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

-- produtos
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to anon, authenticated
  using (
    public.has_establishment_access(establishment_id)
    or exists (
      select 1 from public.establishments e
      where e.id = products.establishment_id and e.status = 'active'
    )
  );

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

-- horários (leitura pública para exibir aberto/fechado)
drop policy if exists business_hours_select on public.business_hours;
create policy business_hours_select on public.business_hours
  for select to anon, authenticated
  using (
    public.has_establishment_access(establishment_id)
    or exists (
      select 1 from public.establishments e
      where e.id = business_hours.establishment_id and e.status = 'active'
    )
  );

drop policy if exists business_hours_write on public.business_hours;
create policy business_hours_write on public.business_hours
  for all to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

-- clientes (dados pessoais: somente a equipe do estabelecimento)
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (public.has_establishment_access(establishment_id));

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers
  for all to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

-- cupons
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons
  for select to authenticated
  using (public.has_establishment_access(establishment_id));

drop policy if exists coupons_write on public.coupons;
create policy coupons_write on public.coupons
  for all to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

-- pedidos
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (public.has_establishment_access(establishment_id));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (public.has_establishment_access(establishment_id))
  with check (public.has_establishment_access(establishment_id));

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
  for delete to authenticated
  using (public.is_establishment_owner(establishment_id) or public.is_superadmin());

-- itens (herdam o acesso do pedido)
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.has_establishment_access(o.establishment_id)
    )
  );

drop policy if exists order_items_write on public.order_items;
create policy order_items_write on public.order_items
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.has_establishment_access(o.establishment_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.has_establishment_access(o.establishment_id)
    )
  );

-- ---------- vitrine pública (view sem dados sensíveis) ----------
drop view if exists public.menu_establishments;
create view public.menu_establishments
with (security_invoker = false) as
  select
    e.id, e.name, e.slug, e.description, e.logo_url, e.cover_url,
    e.phone, e.whatsapp, e.address, e.city, e.primary_color,
    e.delivery_enabled, e.pickup_enabled, e.delivery_fee_cents,
    e.min_order_cents, e.estimated_delivery_minutes,
    e.estimated_pickup_minutes, e.payment_methods, e.is_open_override,
    e.plan_id
  from public.establishments e
  where e.status = 'active';

revoke all on public.menu_establishments from anon, authenticated;
grant select on public.menu_establishments to anon, authenticated;

-- ---------- storage: imagens de produtos ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.establishment_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.establishment_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.establishment_id::text = (storage.foldername(name))[1]
    )
  );

-- ---------- realtime para o painel de pedidos ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
