"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { updatePlanAction, type AdminState } from "@/app/admin/actions";
import { Alert, Badge, Button, Card, CardHeader, Field, Input } from "@/components/ui";

export interface AdminPlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  max_products: number | null;
  max_categories: number | null;
  features: Record<string, unknown>;
  is_active: boolean;
}

const FEATURES = [
  { name: "feature_coupons", key: "coupons", label: "Cupons de desconto" },
  { name: "feature_reports", key: "reports", label: "Relatórios avançados" },
  { name: "feature_branding", key: "branding", label: "Personalização visual" },
  { name: "feature_featured", key: "featured", label: "Destaque na plataforma" },
];

export function AdminPlans({ plans }: { plans: AdminPlanRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: AdminPlanRow }) {
  const [state, action, saving] = useActionState<AdminState, FormData>(updatePlanAction, {});

  return (
    <Card>
      <CardHeader
        title={plan.name}
        description={plan.description ?? `Código: ${plan.code}`}
        action={<Badge tone={plan.is_active ? "green" : "slate"}>{plan.is_active ? "Ativo" : "Inativo"}</Badge>}
      />
      <form action={action} className="space-y-3 p-5">
        <input type="hidden" name="id" value={plan.id} />

        <Field label="Nome do plano">
          <Input name="name" defaultValue={plan.name} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mensalidade (R$)">
            <Input
              name="price"
              defaultValue={(plan.price_cents / 100).toFixed(2).replace(".", ",")}
              inputMode="decimal"
            />
          </Field>
          <Field label="Limite de produtos" hint="vazio = ilimitado">
            <Input
              name="max_products"
              type="number"
              min={1}
              defaultValue={plan.max_products ?? ""}
            />
          </Field>
        </div>

        <Field label="Limite de categorias" hint="vazio = ilimitado">
          <Input
            name="max_categories"
            type="number"
            min={1}
            defaultValue={plan.max_categories ?? ""}
          />
        </Field>

        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Recursos liberados
          </p>
          {FEATURES.map((feature) => (
            <label key={feature.name} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name={feature.name}
                defaultChecked={Boolean(plan.features?.[feature.key])}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {feature.label}
            </label>
          ))}
          <label className="flex items-center gap-2 border-t border-slate-200 pt-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={plan.is_active}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Plano disponível para contratação
          </label>
        </div>

        {state.error ? <Alert tone="red">{state.error}</Alert> : null}
        {state.success ? (
          <Alert tone="green">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> {state.success}
            </span>
          </Alert>
        ) : null}

        <Button type="submit" size="sm" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar plano
        </Button>
      </form>
    </Card>
  );
}
