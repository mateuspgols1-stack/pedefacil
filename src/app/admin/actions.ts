"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export interface AdminState {
  error?: string | null;
  success?: string | null;
}

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

export async function setEstablishmentStatusAction(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "blocked", "pending"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("establishments").update({ status }).eq("id", id);
  revalidateAdmin();
}

export async function updateEstablishmentAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();

  if (!id) return { error: "Estabelecimento inválido." };
  if (name.length < 2) return { error: "Informe o nome do estabelecimento." };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) {
    return { error: "Link inválido: use letras minúsculas, números e hífens." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("establishments")
    .update({
      name,
      slug,
      city: city || null,
      phone: phone || null,
      plan_id: planId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Este link já pertence a outro estabelecimento." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  if (planId) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("establishment_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from("subscriptions").update({ plan_id: planId }).eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        establishment_id: id,
        plan_id: planId,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  revalidateAdmin();
  return { success: "Estabelecimento atualizado." };
}

export async function createEstablishmentAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireSuperadmin();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const planId = String(formData.get("plan_id") ?? "").trim();

  if (!ownerEmail.includes("@")) return { error: "Informe o e-mail do proprietário." };
  if (name.length < 2) return { error: "Informe o nome do estabelecimento." };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) {
    return { error: "Link inválido: use letras minúsculas, números e hífens." };
  }

  const supabase = await createClient();

  const { data: owner } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", ownerEmail)
    .maybeSingle();

  if (!owner) {
    return {
      error:
        "Nenhuma conta com este e-mail. Peça ao responsável para criar a conta em /cadastro antes de vincular o estabelecimento.",
    };
  }

  const { data: created, error } = await supabase
    .from("establishments")
    .insert({ owner_id: owner.id, name, slug, plan_id: planId || null, status: "active" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Este link já está em uso." };
    return { error: `Não foi possível cadastrar: ${error.message}` };
  }

  await supabase.from("memberships").insert({
    establishment_id: created.id,
    user_id: owner.id,
    role: "owner",
  });

  if (planId) {
    await supabase.from("subscriptions").insert({
      establishment_id: created.id,
      plan_id: planId,
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  revalidateAdmin();
  return { success: `Estabelecimento "${name}" cadastrado para ${ownerEmail}.` };
}

export async function updatePlanAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceCents = parseMoneyToCents(String(formData.get("price") ?? "0")) ?? 0;
  const maxProductsRaw = String(formData.get("max_products") ?? "").trim();
  const maxCategoriesRaw = String(formData.get("max_categories") ?? "").trim();

  if (!id) return { error: "Plano inválido." };
  if (name.length < 2) return { error: "Informe o nome do plano." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name,
      price_cents: priceCents,
      max_products: maxProductsRaw ? Math.max(1, Number(maxProductsRaw)) : null,
      max_categories: maxCategoriesRaw ? Math.max(1, Number(maxCategoriesRaw)) : null,
      features: {
        coupons: formData.get("feature_coupons") !== null,
        reports: formData.get("feature_reports") !== null,
        branding: formData.get("feature_branding") !== null,
        featured: formData.get("feature_featured") !== null,
      },
      is_active: formData.get("is_active") !== null,
    })
    .eq("id", id);

  if (error) return { error: `Não foi possível salvar o plano: ${error.message}` };

  revalidateAdmin();
  return { success: "Plano atualizado." };
}

export async function updateSubscriptionAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireSuperadmin();
  const establishmentId = String(formData.get("establishment_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const status = String(formData.get("status") ?? "active");
  const periodEndRaw = String(formData.get("current_period_end") ?? "").trim();

  if (!establishmentId || !planId) return { error: "Selecione o estabelecimento e o plano." };
  if (!["trialing", "active", "past_due", "canceled"].includes(status)) {
    return { error: "Status de assinatura inválido." };
  }

  const supabase = await createClient();
  const periodEnd = periodEndRaw ? new Date(`${periodEndRaw}T23:59:59`).toISOString() : null;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan_id: planId,
        status,
        current_period_end: periodEnd,
      })
      .eq("id", existing.id);
    if (error) return { error: `Não foi possível salvar a assinatura: ${error.message}` };
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      establishment_id: establishmentId,
      plan_id: planId,
      status,
      current_period_end: periodEnd,
    });
    if (error) return { error: `Não foi possível criar a assinatura: ${error.message}` };
  }

  await supabase
    .from("establishments")
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq("id", establishmentId);

  revalidateAdmin();
  return { success: "Assinatura atualizada." };
}
