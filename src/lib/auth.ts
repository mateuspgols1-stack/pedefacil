import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { provisionEstablishment } from "@/lib/onboarding";
import { planLimits, type PlanLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type {
  Establishment,
  Membership,
  Plan,
  Profile,
  Subscription,
  UserRole,
} from "@/lib/types";

export interface AuthContext {
  user: { id: string; email: string | null; metadata: Record<string, unknown> };
  profile: Profile;
  establishment: Establishment | null;
  membership: Membership | null;
  subscription: Subscription | null;
  plan: Plan | null;
}

/**
 * Carrega usuário, perfil, estabelecimento e plano da requisição atual.
 * Não é cacheado: o layout pode provisionar o estabelecimento e as páginas
 * filhas precisam enxergar esse registro recém-criado.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile: Profile = (profileRow as Profile | null) ?? {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    role: "owner",
    created_at: user.created_at ?? new Date().toISOString(),
  };

  const { data: membershipRow } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let establishment: Establishment | null = null;
  let subscription: Subscription | null = null;
  let plan: Plan | null = null;

  if (membershipRow) {
    const membership = membershipRow as Membership;
    const { data: establishmentRow } = await supabase
      .from("establishments")
      .select("*")
      .eq("id", membership.establishment_id)
      .maybeSingle();
    establishment = (establishmentRow as Establishment | null) ?? null;

    const { data: subscriptionRow } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("establishment_id", membership.establishment_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    subscription = (subscriptionRow as Subscription | null) ?? null;

    if (establishment?.plan_id) {
      const { data: planRow } = await supabase
        .from("plans")
        .select("*")
        .eq("id", establishment.plan_id)
        .maybeSingle();
      plan = (planRow as Plan | null) ?? null;
    }
  }

  if (!plan) {
    const { data: basicPlan } = await supabase
      .from("plans")
      .select("*")
      .eq("code", "basic")
      .maybeSingle();
    plan = (basicPlan as Plan | null) ?? null;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
    },
    profile,
    establishment,
    membership: (membershipRow as Membership | null) ?? null,
    subscription,
    plan,
  };
}

export function isSuperadmin(ctx: AuthContext | null) {
  return ctx?.profile.role === "superadmin";
}

export async function requireAuth(nextPath?: string): Promise<AuthContext> {
  if (!isSupabaseConfigured) redirect("/setup");
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return ctx;
}

export async function requireSuperadmin(): Promise<AuthContext> {
  const ctx = await requireAuth("/admin");
  if (!isSuperadmin(ctx)) redirect("/painel");
  return ctx;
}

const FALLBACK_PLAN: Plan = {
  id: "",
  code: "basic",
  name: "Básico",
  description: null,
  price_cents: 4990,
  max_products: 40,
  max_categories: 6,
  max_units: 1,
  features: { coupons: false, reports: false, branding: false, featured: false },
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
};

export interface EstablishmentContext extends AuthContext {
  establishment: Establishment;
  plan: Plan;
  limits: PlanLimits;
}

/**
 * Garante que o usuário autenticado tenha um estabelecimento utilizável.
 * Se a conta acabou de ser criada, provisiona estabelecimento + assinatura.
 */
export async function requireEstablishment(): Promise<EstablishmentContext> {
  const ctx = await requireAuth("/painel");

  if (isSuperadmin(ctx) && !ctx.establishment) redirect("/admin");

  let establishment = ctx.establishment;

  if (!establishment) {
    const supabase = await createClient();
    const metadataName =
      typeof ctx.user.metadata.establishment_name === "string"
        ? ctx.user.metadata.establishment_name
        : "";
    const fallbackName = ctx.profile.full_name
      ? `${ctx.profile.full_name} — Meu estabelecimento`
      : "Meu estabelecimento";

    const { establishment: created, error } = await provisionEstablishment(supabase, {
      userId: ctx.user.id,
      establishmentName: metadataName || fallbackName,
      ownerName: ctx.profile.full_name,
      phone: typeof ctx.user.metadata.phone === "string" ? ctx.user.metadata.phone : null,
    });

    if (!created) {
      throw new Error(error ?? "Não foi possível preparar o seu estabelecimento.");
    }
    establishment = created;
  }

  if (establishment.status === "blocked") redirect("/painel/bloqueado");

  const plan = ctx.plan ?? FALLBACK_PLAN;
  return { ...ctx, establishment, plan, limits: planLimits(plan) };
}

export function isOwner(ctx: AuthContext) {
  return ctx.membership?.role === "owner" || isSuperadmin(ctx);
}

export function roleLabel(role: UserRole) {
  if (role === "superadmin") return "Superadministrador";
  if (role === "staff") return "Equipe";
  return "Proprietário";
}
