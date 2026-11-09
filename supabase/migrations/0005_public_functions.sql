-- ============================================================
-- PedidoFácil — 0005 funções públicas (cardápio digital)
-- Execute no SQL Editor do Supabase depois de 0001..0004.
-- ============================================================

-- Validação de cupom usada pelo cardápio público.
-- Não expõe a lista de cupons: recebe código + subtotal e devolve
-- apenas o desconto aplicável e uma mensagem para o cliente.
create or replace function public.validate_coupon(
  p_slug text,
  p_code text,
  p_subtotal_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_est public.establishments%rowtype;
  v_coupon public.coupons%rowtype;
  v_code text;
  v_subtotal integer := greatest(coalesce(p_subtotal_cents, 0), 0);
  v_discount integer := 0;
begin
  select * into v_est
  from public.establishments
  where slug = lower(btrim(coalesce(p_slug, '')))
    and status = 'active';

  if v_est.id is null then
    return jsonb_build_object('valid', false, 'message', 'Estabelecimento indisponível.');
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code = '' then
    return jsonb_build_object('valid', false, 'message', 'Informe o código do cupom.');
  end if;

  select * into v_coupon
  from public.coupons
  where establishment_id = v_est.id
    and code = v_code
    and is_active;

  if v_coupon.id is null then
    return jsonb_build_object('valid', false, 'message', 'Cupom não encontrado.');
  end if;

  if v_coupon.starts_at > now() then
    return jsonb_build_object('valid', false, 'message', 'Este cupom ainda não está válido.');
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('valid', false, 'message', 'Este cupom expirou.');
  end if;

  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('valid', false, 'message', 'Este cupom atingiu o limite de usos.');
  end if;

  if v_subtotal < v_coupon.min_order_cents then
    return jsonb_build_object(
      'valid', false,
      'message', 'Cupom válido para pedidos a partir de R$ ' ||
        to_char(v_coupon.min_order_cents / 100.0, 'FM999G999D00') || '.'
    );
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := floor(v_subtotal * v_coupon.discount_value / 100.0);
  else
    v_discount := v_coupon.discount_value;
  end if;

  v_discount := greatest(0, least(v_discount, v_subtotal));

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_cents', v_discount,
    'message', 'Cupom aplicado.'
  );
end;
$$;

revoke all on function public.validate_coupon(text, text, integer) from public;
grant execute on function public.validate_coupon(text, text, integer) to anon, authenticated;
