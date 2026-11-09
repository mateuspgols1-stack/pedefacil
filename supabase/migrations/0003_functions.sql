-- ============================================================
-- PedidoFácil — 0003 funções de negócio
-- O pedido público é criado por RPC: o cliente nunca define preços.
-- ============================================================

create or replace function public.create_order(p_slug text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_est public.establishments%rowtype;
  v_coupon public.coupons%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_qty int;
  v_unit int;
  v_subtotal int := 0;
  v_delivery int := 0;
  v_discount int := 0;
  v_total int;
  v_customer_id uuid;
  v_order_id uuid;
  v_code text;
  v_coupon_code text;
  v_fulfillment text;
  v_payment text;
  v_name text;
  v_phone text;
  v_address text;
  v_notes text;
  v_change int;
begin
  select * into v_est
  from public.establishments
  where slug = lower(btrim(p_slug)) and status = 'active';

  if not found then
    raise exception 'ESTABELECIMENTO_INDISPONIVEL';
  end if;

  v_fulfillment := coalesce(p_payload ->> 'fulfillment', 'delivery');
  if v_fulfillment not in ('delivery', 'pickup') then
    raise exception 'TIPO_ENTREGA_INVALIDO';
  end if;
  if v_fulfillment = 'delivery' and not v_est.delivery_enabled then
    raise exception 'ENTREGA_DESATIVADA';
  end if;
  if v_fulfillment = 'pickup' and not v_est.pickup_enabled then
    raise exception 'RETIRADA_DESATIVADA';
  end if;

  v_payment := coalesce(p_payload ->> 'payment_method', 'pix');
  if not (v_payment = any (v_est.payment_methods)) then
    raise exception 'PAGAMENTO_INVALIDO';
  end if;

  v_name := btrim(coalesce(p_payload ->> 'customer_name', ''));
  v_phone := regexp_replace(coalesce(p_payload ->> 'customer_phone', ''), '\D', '', 'g');
  v_address := nullif(btrim(coalesce(p_payload ->> 'address', '')), '');
  v_notes := nullif(btrim(coalesce(p_payload ->> 'notes', '')), '');
  begin
    v_change := nullif(p_payload ->> 'change_for_cents', '')::int;
  exception when others then
    v_change := null;
  end;

  if length(v_name) < 2 then
    raise exception 'NOME_OBRIGATORIO';
  end if;
  if length(v_phone) < 10 then
    raise exception 'TELEFONE_INVALIDO';
  end if;
  if v_fulfillment = 'delivery' and (v_address is null or length(v_address) < 8) then
    raise exception 'ENDERECO_OBRIGATORIO';
  end if;
  if jsonb_typeof(p_payload -> 'items') is distinct from 'array'
     or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'CARRINHO_VAZIO';
  end if;

  for v_item in select * from jsonb_array_elements(p_payload -> 'items') loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'QUANTIDADE_INVALIDA';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and establishment_id = v_est.id
      and is_active;

    if not found then
      raise exception 'PRODUTO_INDISPONIVEL';
    end if;

    v_unit := coalesce(v_product.promo_price_cents, v_product.price_cents);
    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price_cents', v_unit,
      'quantity', v_qty,
      'notes', nullif(btrim(coalesce(v_item ->> 'notes', '')), ''),
      'total_cents', v_unit * v_qty
    );
  end loop;

  if v_subtotal < v_est.min_order_cents then
    raise exception 'PEDIDO_MINIMO';
  end if;

  if v_fulfillment = 'delivery' then
    v_delivery := v_est.delivery_fee_cents;
  end if;

  v_coupon_code := upper(nullif(btrim(coalesce(p_payload ->> 'coupon_code', '')), ''));
  if v_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where establishment_id = v_est.id and code = v_coupon_code and is_active
    for update;

    if not found then
      raise exception 'CUPOM_INVALIDO';
    end if;
    if v_coupon.starts_at > now() then
      raise exception 'CUPOM_INVALIDO';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      raise exception 'CUPOM_EXPIRADO';
    end if;
    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'CUPOM_ESGOTADO';
    end if;
    if v_subtotal < v_coupon.min_order_cents then
      raise exception 'CUPOM_PEDIDO_MINIMO';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.discount_value / 100.0);
    else
      v_discount := v_coupon.discount_value;
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  v_total := greatest(v_subtotal + v_delivery - v_discount, 0);

  loop
    v_code := 'PF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.customers (establishment_id, name, phone, address)
  values (v_est.id, v_name, v_phone, v_address)
  on conflict (establishment_id, phone) do update
    set name = excluded.name,
        address = coalesce(excluded.address, public.customers.address)
  returning id into v_customer_id;

  insert into public.orders (
    establishment_id, code, customer_id, customer_name, customer_phone,
    fulfillment, address, notes, payment_method, change_for_cents,
    subtotal_cents, delivery_fee_cents, discount_cents, total_cents, coupon_code
  ) values (
    v_est.id, v_code, v_customer_id, v_name, v_phone,
    v_fulfillment, v_address, v_notes, v_payment, v_change,
    v_subtotal, v_delivery, v_discount, v_total, v_coupon_code
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity, notes, total_cents)
  select
    v_order_id,
    (i ->> 'product_id')::uuid,
    i ->> 'product_name',
    (i ->> 'unit_price_cents')::int,
    (i ->> 'quantity')::int,
    i ->> 'notes',
    (i ->> 'total_cents')::int
  from jsonb_array_elements(v_items) as i;

  update public.customers
  set orders_count = orders_count + 1,
      total_spent_cents = total_spent_cents + v_total
  where id = v_customer_id;

  if v_coupon_code is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'code', v_code,
    'subtotal_cents', v_subtotal,
    'delivery_fee_cents', v_delivery,
    'discount_cents', v_discount,
    'total_cents', v_total
  );
end;
$$;

revoke all on function public.create_order(text, jsonb) from public;
grant execute on function public.create_order(text, jsonb) to anon, authenticated;

-- Acompanhamento público por código (sem expor telefone/endereço completo)
create or replace function public.track_order(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'code', o.code,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'fulfillment', o.fulfillment,
    'payment_method', o.payment_method,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'discount_cents', o.discount_cents,
    'total_cents', o.total_cents,
    'customer_name', o.customer_name,
    'address', case when o.fulfillment = 'delivery' then o.address else null end,
    'establishment', jsonb_build_object(
      'name', e.name,
      'slug', e.slug,
      'whatsapp', e.whatsapp,
      'phone', e.phone,
      'primary_color', e.primary_color
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price_cents', i.unit_price_cents,
        'total_cents', i.total_cents,
        'notes', i.notes
      ) order by i.id)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders o
  join public.establishments e on e.id = o.establishment_id
  where upper(o.code) = upper(btrim(p_code));

  return v_result;
end;
$$;

revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- Verificação de disponibilidade de slug (usada no cadastro)
create or replace function public.slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.establishments e where e.slug = lower(btrim(p_slug))
  );
$$;

grant execute on function public.slug_available(text) to anon, authenticated;
