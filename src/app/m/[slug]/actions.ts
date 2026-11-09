"use server";

import { buildOrderPayload, type CartLine } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { Fulfillment, PaymentMethod } from "@/lib/types";

export interface CheckoutState {
  error?: string | null;
  orderCode?: string | null;
}

export interface CouponResult {
  valid: boolean;
  message: string;
  code?: string;
  discountCents?: number;
}

const VALID_FULFILLMENTS: Fulfillment[] = ["delivery", "pickup"];
const VALID_PAYMENTS: PaymentMethod[] = ["pix", "cash", "card", "online"];

export async function validateCouponAction(
  slug: string,
  code: string,
  subtotalCents: number,
): Promise<CouponResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_slug: slug,
    p_code: code,
    p_subtotal_cents: Math.max(0, Math.floor(subtotalCents)),
  });

  if (error) {
    return { valid: false, message: "Não foi possível validar o cupom agora." };
  }

  const payload = (data ?? {}) as {
    valid?: boolean;
    message?: string;
    code?: string;
    discount_cents?: number;
  };

  return {
    valid: Boolean(payload.valid),
    message: payload.message ?? (payload.valid ? "Cupom aplicado." : "Cupom inválido."),
    code: payload.code,
    discountCents: payload.discount_cents ?? 0,
  };
}

export async function createOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "Estabelecimento inválido." };

  let lines: CartLine[] = [];
  try {
    const raw = JSON.parse(String(formData.get("items") ?? "[]")) as CartLine[];
    lines = raw.filter(
      (line) => typeof line?.productId === "string" && Number(line?.quantity) > 0,
    );
  } catch {
    return { error: "Não foi possível ler o carrinho. Atualize a página e tente novamente." };
  }

  if (lines.length === 0) return { error: "Seu carrinho está vazio." };

  const fulfillment = String(formData.get("fulfillment") ?? "delivery") as Fulfillment;
  if (!VALID_FULFILLMENTS.includes(fulfillment)) {
    return { error: "Escolha entrega ou retirada." };
  }

  const paymentMethod = String(formData.get("payment_method") ?? "pix") as PaymentMethod;
  if (!VALID_PAYMENTS.includes(paymentMethod)) {
    return { error: "Selecione uma forma de pagamento válida." };
  }

  const customerName = String(formData.get("customer_name") ?? "").trim();
  if (customerName.length < 2) return { error: "Informe seu nome." };

  const phoneDigits = String(formData.get("customer_phone") ?? "").replace(/\D/g, "");
  if (phoneDigits.length < 10) return { error: "Informe um telefone válido com DDD." };

  const address = String(formData.get("address") ?? "").trim();
  if (fulfillment === "delivery" && address.length < 8) {
    return { error: "Informe o endereço completo para entrega." };
  }

  const changeForRaw = String(formData.get("change_for") ?? "").trim();
  let changeForCents: number | null = null;
  if (paymentMethod === "cash" && changeForRaw) {
    const parsed = Math.round(Number(changeForRaw.replace(",", ".")) * 100);
    if (Number.isFinite(parsed) && parsed > 0) changeForCents = parsed;
  }

  const payload = buildOrderPayload({
    lines,
    fulfillment,
    customerName,
    customerPhone: phoneDigits,
    address: fulfillment === "delivery" ? address : null,
    notes: String(formData.get("notes") ?? ""),
    paymentMethod,
    changeForCents,
    couponCode: String(formData.get("coupon_code") ?? ""),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_slug: slug,
    p_payload: payload,
  });

  if (error) {
    return { error: error.message || "Não foi possível finalizar o pedido." };
  }

  const result = (data ?? {}) as { code?: string };
  if (!result.code) {
    return { error: "O pedido não foi confirmado. Tente novamente." };
  }

  return { orderCode: result.code };
}
