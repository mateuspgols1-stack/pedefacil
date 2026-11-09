import { Sparkles } from "lucide-react";

import { CouponsManager, type CouponRow } from "@/components/coupons-manager";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cupons" };

export default async function CouponsPage() {
  const ctx = await requireEstablishment();
  const limits = planLimits(ctx.plan);
  const enabled = limits.features.coupons;

  let coupons: CouponRow[] = [];
  if (enabled) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("coupons")
      .select(
        "id, code, discount_type, discount_value, min_order_cents, max_uses, used_count, expires_at, is_active",
      )
      .eq("establishment_id", ctx.establishment.id)
      .order("created_at", { ascending: false });
    coupons = (data ?? []) as CouponRow[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Marketing"
        title="Cupons de desconto"
        description="Crie códigos promocionais com regras de desconto, pedido mínimo e validade."
      />

      {!enabled ? (
        <div className="card-base p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Cupons disponíveis a partir do plano Profissional
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Seu plano atual é <strong>{limits.name}</strong>. Faça upgrade para criar cupons de
                desconto e campanhas promocionais.
              </p>
              <ButtonLink href="/painel/configuracoes#plano" size="sm" className="mt-3">
                Ver planos
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : (
        <>
          <Alert tone="blue">
            O cupom é validado automaticamente no checkout do cardápio digital: desconto, pedido
            mínimo, validade e limite de usos.
          </Alert>
          <CouponsManager coupons={coupons} />
        </>
      )}
    </div>
  );
}
