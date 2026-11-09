import type { Plan, PlanFeatures } from "@/lib/types";

export interface PlanLimits {
  code: string;
  name: string;
  priceCents: number;
  maxProducts: number | null;
  maxCategories: number | null;
  maxUnits: number;
  features: Required<Pick<PlanFeatures, "coupons" | "reports" | "branding" | "featured">>;
}

const FALLBACK: PlanLimits = {
  code: "basic",
  name: "Básico",
  priceCents: 4990,
  maxProducts: 40,
  maxCategories: 6,
  maxUnits: 1,
  features: { coupons: false, reports: false, branding: false, featured: false },
};

/** Limites efetivos do plano contratado (com fallback seguro). */
export function planLimits(plan: Plan | null | undefined): PlanLimits {
  if (!plan) return FALLBACK;
  const features = plan.features ?? {};
  return {
    code: plan.code,
    name: plan.name,
    priceCents: plan.price_cents,
    maxProducts: plan.max_products,
    maxCategories: plan.max_categories,
    maxUnits: plan.max_units ?? 1,
    features: {
      coupons: Boolean(features.coupons),
      reports: Boolean(features.reports),
      branding: Boolean(features.branding),
      featured: Boolean(features.featured),
    },
  };
}

export function canAddMore(currentCount: number, max: number | null) {
  if (max === null || max === undefined) return true;
  return currentCount < max;
}

export function limitLabel(max: number | null) {
  return max === null || max === undefined ? "ilimitado" : String(max);
}
