"use client";

import { Loader2, Lock, Pencil, Plus, Unlock } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createEstablishmentAction,
  setEstablishmentStatusAction,
  updateEstablishmentAction,
  type AdminState,
} from "@/app/admin/actions";
import { Alert, Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { EstablishmentStatus } from "@/lib/types";

export interface AdminEstablishmentRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  status: EstablishmentStatus;
  plan_id: string | null;
  created_at: string;
  ownerEmail: string | null;
  ordersCount: number;
}

interface PlanOption {
  id: string;
  name: string;
}

const STATUS_TONE: Record<EstablishmentStatus, "green" | "amber" | "red"> = {
  active: "green",
  pending: "amber",
  blocked: "red",
};

const STATUS_LABEL: Record<EstablishmentStatus, string> = {
  active: "Ativo",
  pending: "Pendente",
  blocked: "Bloqueado",
};

export function AdminEstablishments({
  rows,
  plans,
}: {
  rows: AdminEstablishmentRow[];
  plans: PlanOption[];
}) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, createAction, creating] = useActionState<AdminState, FormData>(
    createEstablishmentAction,
    {},
  );

  const filtered = rows.filter((row) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      row.name.toLowerCase().includes(term) ||
      row.slug.toLowerCase().includes(term) ||
      (row.ownerEmail ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Estabelecimentos da plataforma"
          description={`${rows.length} cadastrados · ${rows.filter((r) => r.status === "active").length} ativos`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, link ou e-mail"
                className="w-full sm:w-64"
              />
              <Button size="sm" onClick={() => setCreateOpen((open) => !open)}>
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </div>
          }
        />

        {createOpen ? (
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
            <form action={createAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="E-mail do proprietário" className="lg:col-span-2">
                <Input name="owner_email" type="email" required placeholder="dono@restaurante.com" />
              </Field>
              <Field label="Nome">
                <Input name="name" required placeholder="Pizzaria Bella" />
              </Field>
              <Field label="Link (slug)" hint="pedidofacil.app/m/link">
                <Input name="slug" required placeholder="pizzaria-bella" />
              </Field>
              <Field label="Plano">
                <Select name="plan_id" defaultValue={plans[0]?.id ?? ""}>
                  <option value="">Sem plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2 lg:col-span-5">
                {createState.error ? <Alert tone="red">{createState.error}</Alert> : null}
                {createState.success ? <Alert tone="green">{createState.success}</Alert> : null}
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cadastrar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Fechar
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Nenhum estabelecimento encontrado.
            </p>
          ) : (
            filtered.map((row) => (
              <EstablishmentItem key={row.id} row={row} plans={plans} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function EstablishmentItem({
  row,
  plans,
}: {
  row: AdminEstablishmentRow;
  plans: PlanOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, saving] = useActionState<AdminState, FormData>(updateEstablishmentAction, {});
  const planName = plans.find((plan) => plan.id === row.plan_id)?.name ?? "Sem plano";

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
          {row.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
            <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
            <Badge tone="slate">{planName}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            /m/{row.slug} · {row.ownerEmail ?? "sem responsável"} · {row.ordersCount} pedidos ·
            criado em {formatDate(row.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing((open) => !open)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <form action={setEstablishmentStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input
              type="hidden"
              name="status"
              value={row.status === "blocked" ? "active" : "blocked"}
            />
            <Button size="sm" variant={row.status === "blocked" ? "success" : "danger"} type="submit">
              {row.status === "blocked" ? (
                <>
                  <Unlock className="h-3.5 w-3.5" /> Liberar
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Bloquear
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {editing ? (
        <form action={action} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="id" value={row.id} />
          <Field label="Nome">
            <Input name="name" defaultValue={row.name} required />
          </Field>
          <Field label="Link (slug)">
            <Input name="slug" defaultValue={row.slug} required />
          </Field>
          <Field label="Cidade">
            <Input name="city" defaultValue={row.city ?? ""} />
          </Field>
          <Field label="Telefone">
            <Input name="phone" defaultValue={row.phone ?? ""} />
          </Field>
          <Field label="Plano">
            <Select name="plan_id" defaultValue={row.plan_id ?? ""}>
              <option value="">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-5">
            {state.error ? <Alert tone="red">{state.error}</Alert> : null}
            {state.success ? <Alert tone="green">{state.success}</Alert> : null}
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar alterações
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
