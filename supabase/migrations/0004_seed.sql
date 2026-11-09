-- ============================================================
-- PedidoFácil — 0004 planos comerciais
-- ============================================================

insert into public.plans (code, name, description, price_cents, max_products, max_categories, max_units, features, sort_order)
values
  (
    'basic',
    'Básico',
    'Para quem está começando a vender online.',
    4990,
    40,
    6,
    1,
    '{"coupons": false, "reports": false, "branding": false, "featured": false, "support": "email"}'::jsonb,
    1
  ),
  (
    'pro',
    'Profissional',
    'Para restaurantes que já vendem todos os dias.',
    9990,
    200,
    20,
    2,
    '{"coupons": true, "reports": true, "branding": true, "featured": true, "support": "whatsapp"}'::jsonb,
    2
  ),
  (
    'premium',
    'Premium',
    'Operação completa, sem limites de cardápio.',
    17990,
    null,
    null,
    5,
    '{"coupons": true, "reports": true, "branding": true, "featured": true, "support": "priority"}'::jsonb,
    3
  )
on conflict (code) do nothing;

-- Horário padrão: aberto de segunda a domingo, 18h às 23h.
create or replace function public.seed_default_hours(p_establishment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.business_hours (establishment_id, weekday, is_closed, open_time, close_time)
  select p_establishment_id, d, false, '18:00'::time, '23:00'::time
  from generate_series(0, 6) as d
  on conflict (establishment_id, weekday) do nothing;
$$;

grant execute on function public.seed_default_hours(uuid) to authenticated;
