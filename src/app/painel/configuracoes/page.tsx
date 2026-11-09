import { Check, ExternalLink, Sparkles, Store } from "lucide-react";

import { HoursForm, IdentityForm, OperationForm } from "@/components/settings-forms";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { limitLabel, planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();

  const [{ data: hoursData }, { data: plansData }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("weekday, is_closed, open_time, close_time")
      .eq("establishment_id", ctx.establishment.id)
      .order("weekday"),
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const plans = (plansData ?? []) as Plan[];
  const current = planLimits(ctx.plan);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ajustes"
        title="Configurações"
        description="Dados públicos, operação, horários e plano do seu estabelecimento."
        actions={
          <a
            href={`/m/${ctx.establishment.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> Ver cardápio
          </a>
        }
      />

      <div className="card-base p-5">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-bold text-slate-900">Dados do estabelecimento</h2>
        </div>
        <IdentityForm
          brandingEnabled={ctx.limits.features.branding}
          values={{
            name: ctx.establishment.name,
            slug: ctx.establishment.slug,
            description: ctx.establishment.description,
            phone: ctx.establishment.phone,
            whatsapp: ctx.establishment.whatsapp,
            address: ctx.establishment.address,
            city: ctx.establishment.city,
            primary_color: ctx.establishment.primary_color,
            logo_url: ctx.establishment.logo_url,
            cover_url: ctx.establishment.cover_url,
          }}
        />
      </div>

      <div className="card-base p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Entrega, retirada e pagamento</h2>
        <OperationForm
          values={{
            delivery_enabled: ctx.establishment.delivery_enabled,
            pickup_enabled: ctx.establishment.pickup_enabled,
            delivery_fee_cents: ctx.establishment.delivery_fee_cents,
            min_order_cents: ctx.establishment.min_order_cents,
            estimated_delivery_minutes: ctx.establishment.estimated_delivery_minutes,
            estimated_pickup_minutes: ctx.establishment.estimated_pickup_minutes,
            payment_methods: ctx.establishment.payment_methods ?? [],
            is_open_override: ctx.establishment.is_open_override,
          }}
        />
      </div>

      <div className="card-base p-5">
        <h2 className="mb-1 text-sm font-bold text-slate-900">Horários de funcionamento</h2>
        <p className="mb-4 text-xs text-slate-500">
          O cardápio digital respeita estes horários para indicar aberto/fechado.
        </p>
        <HoursForm
          hours={(hoursData ?? []).map((row) => ({
            weekday: row.weekday,
            is_closed: row.is_closed,
            open_time: row.open_time,
            close_time: row.close_time,
          }))}
        />
      </div>

      <div id="plano" className="card-base p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-bold text-slate-900">Seu plano</h2>
          <Badge tone="brand">{current.name}</Badge>
        </div>
        <p className="text-xs text-slate-500">
          Mensalidade de {formatBRL(current.priceCents)} · até {limitLabel(current.maxProducts)}{" "}
          produtos · até {limitLabel(current.maxCategories)} categorias
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { key: "coupons", label: "Cupons de desconto" },
            { key: "reports", label: "Relatórios e exportação" },
            { key: "branding", label: "Identidade visual (logo e capa)" },
            { key: "featured", label: "Produtos em destaque" },
          ].map((feature) => {
            const enabled = current.features[feature.key as keyof typeof current.features];
            return (
              <div
                key={feature.key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <span
                  className={
                    enabled
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                      : "flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                  }
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={enabled ? "font-medium text-slate-800" : "text-slate-500"}>
                  {feature.label}
                </span>
              </div>
            );
          })}
        </div>

        {plans.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-semibold">Plano</th>
                  <th className="py-2 font-semibold">Mensalidade</th>
                  <th className="py-2 font-semibold">Produtos</th>
                  <th className="py-2 font-semibold">Categorias</th>
                  <th className="py-2 font-semibold">Cupons</th>
                  <th className="py-2 font-semibold">Relatórios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const limits = planLimits(plan);
                  const isCurrent = plan.code === current.code;
                  return (
                    <tr key={plan.id} className={isCurrent ? "bg-brand-50/40" : ""}>
                      <td className="py-2.5 font-semibold text-slate-800">
                        {plan.name}
                        {isCurrent ? <span className="ml-2 text-[10px] text-brand-700">atual</span> : null}
                      </td>
                      <td className="py-2.5 text-slate-600">{formatBRL(limits.priceCents)}</td>
                      <td className="py-2.5 text-slate-600">{limitLabel(limits.maxProducts)}</td>
                      <td className="py-2.5 text-slate-600">{limitLabel(limits.maxCategories)}</td>
                      <td className="py-2.5 text-slate-600">
                        {limits.features.coupons ? "Sim" : "—"}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {limits.features.reports ? "Sim" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <Alert tone="slate">
          A mudança de plano é aplicada pelo administrador da plataforma na assinatura do seu
          estabelecimento. Os limites de produtos, categorias e recursos são aplicados
          automaticamente.
        </Alert>
      </div>
    </div>
  );
}
