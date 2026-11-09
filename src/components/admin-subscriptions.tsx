"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { updateSubscriptionAction, type AdminState } from "@/app/admin/actions";
import { Alert, Badge, Button, Input, Select } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";

export interface AdminSubscriptionRow {
  establishmentId: string;
  establishmentName: string;
  slug: string;
  planId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  subscriptionStatus: string | null;
  mrrCents: number;
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  active: "green",
  trialing: "blue" as never,
  past_due: "amber",
  canceled: "red",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Em atraso",
  canceled: "Cancelada",
};

export function AdminSubscriptions({
  rows,
  plans,
}: {
  rows: AdminSubscriptionRow[];
  plans: Array<{ id: string; name: string; price_cents: number }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="hidden grid-cols-12 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
        <span className="col-span-4">Estabelecimento</span>
        <span className="col-span-2">Plano atual</span>
        <span className="col-span-2">Situação</span>
        <span className="col-span-2">Vence em</span>
        <span className="col-span-2 text-right">Mensalidade</span>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Nenhum estabelecimento cadastrado.
          </p>
        ) : (
          rows.map((row) => <SubscriptionItem key={row.establishmentId} row={row} plans={plans} />)
        )}
      </div>
    </div>
  );
}

function SubscriptionItem({
  row,
  plans,
}: {
  row: AdminSubscriptionRow;
  plans: Array<{ id: string; name: string; price_cents: number }>;
}) {
  const [state, action, saving] = useActionState<AdminState, FormData>(updateSubscriptionAction, {});
  const planName = plans.find((plan) => plan.id === row.planId)?.name ?? "Sem plano";
  const status = row.subscriptionStatus ?? "active";

  return (
    <div className="px-5 py-4">
      <div className="grid gap-3 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">
          <p className="text-sm font-semibold text-slate-900">{row.establishmentName}</p>
          <p className="text-xs text-slate-500">/m/{row.slug}</p>
        </div>
        <div className="lg:col-span-2">
          <Badge tone="slate">{planName}</Badge>
        </div>
        <div className="lg:col-span-2">
          <Badge tone={STATUS_TONE[status] ?? "slate"}>{STATUS_LABEL[status] ?? status}</Badge>
        </div>
        <div className="text-xs text-slate-500 lg:col-span-2">
          {row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "—"}
        </div>
        <div className="text-sm font-semibold text-slate-900 lg:col-span-2 lg:text-right">
          {formatBRL(row.mrrCents)}
        </div>
      </div>

      <form
        action={action}
        className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input type="hidden" name="establishment_id" value={row.establishmentId} />
        <Select name="plan_id" defaultValue={row.planId ?? plans[0]?.id ?? ""} aria-label="Plano">
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {formatBRL(plan.price_cents)}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} aria-label="Situação">
          <option value="trialing">Em teste</option>
          <option value="active">Ativa</option>
          <option value="past_due">Em atraso</option>
          <option value="canceled">Cancelada</option>
        </Select>
        <Input
          type="date"
          name="current_period_end"
          defaultValue={row.currentPeriodEnd ? row.currentPeriodEnd.slice(0, 10) : ""}
          aria-label="Vencimento"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Atualizar
        </Button>
        <div className="sm:col-span-2 lg:col-span-5">
          {state.error ? <Alert tone="red">{state.error}</Alert> : null}
          {state.success ? <Alert tone="green">{state.success}</Alert> : null}
        </div>
      </form>
    </div>
  );
}
