"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export interface CouponState {
  error?: string | null;
  success?: string | null;
}

function parseCoupon(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const discountType = String(formData.get("discount_type") ?? "percent");
  const rawValue = String(formData.get("discount_value") ?? "").trim();
  const minOrder = parseMoneyToCents(formData.get("min_order") ?? "0") ?? 0;
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();

  if (code.length < 3) return { error: "O código precisa ter pelo menos 3 caracteres." };

  let discountValue: number | null = null;
  if (discountType === "percent") {
    const percent = Number(rawValue.replace("%", "").replace(",", "."));
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return { error: "Informe um percentual entre 1 e 100." };
    }
    discountValue = Math.round(percent);
  } else {
    discountValue = parseMoneyToCents(rawValue);
    if (!discountValue || discountValue <= 0) {
      return { error: "Informe um valor de desconto válido." };
    }
  }

  return {
    values: {
      code,
      discount_type: discountType === "fixed" ? "fixed" : "percent",
      discount_value: discountValue,
      min_order_cents: Math.max(0, minOrder),
      max_uses: maxUsesRaw ? Math.max(1, Number(maxUsesRaw)) : null,
      expires_at: expiresRaw ? new Date(`${expiresRaw}T23:59:59`).toISOString() : null,
    },
  };
}

export async function createCouponAction(
  _prev: CouponState,
  formData: FormData,
): Promise<CouponState> {
  const ctx = await requireEstablishment();
  if (!planLimits(ctx.plan).features.coupons) {
    return { error: "Cupons de desconto estão disponíveis nos planos Profissional e Premium." };
  }

  const parsed = parseCoupon(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    establishment_id: ctx.establishment.id,
    ...parsed.values,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe um cupom com este código." };
    return { error: `Não foi possível criar o cupom: ${error.message}` };
  }

  revalidatePath("/painel/cupons");
  return { success: "Cupom criado." };
}

export async function updateCouponAction(
  _prev: CouponState,
  formData: FormData,
): Promise<CouponState> {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cupom inválido." };

  const parsed = parseCoupon(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ ...parsed.values, is_active: formData.get("is_active") !== null })
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  if (error) {
    if (error.code === "23505") return { error: "Já existe um cupom com este código." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/painel/cupons");
  return { success: "Cupom atualizado." };
}

export async function toggleCouponAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/cupons");
}

export async function deleteCouponAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("coupons")
    .delete()
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/cupons");
}
