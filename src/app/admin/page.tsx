import {
  ArrowUpRight,
  Building2,
  CreditCard,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visão geral · Administração" };

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

export default async function AdminOverviewPage() {
  await requireSuperadmin();
  const supabase = await createClient();

  const [establishments, orders, customers, subscriptions, plans, recent] = await Promise.all([
    supabase.from("establishments").select("id, status"),
    supabase.from("orders").select("total_cents, status, created_at"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("status, plans(name, price_cents)"),
    supabase.from("plans").select("id, name, price_cents", { count: "exact" }),
    supabase
      .from("establishments")
      .select("id, name, slug, status, created_at, plan_id")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const establishmentRows = establishments.data ?? [];
  const orderRows = orders.data ?? [];
  const activeEstablishments = establishmentRows.filter((row) => row.status === "active").length;
  const blockedEstablishments = establishmentRows.filter((row) => row.status === "blocked").length;
  const validOrders = orderRows.filter((row) => row.status !== "canceled");
  const gmv = validOrders.reduce((sum, row) => sum + (row.total_cents ?? 0), 0);

  const activeSubscriptions = (subscriptions.data ?? []).filter(
    (row) => row.status === "active" || row.status === "trialing",
  );
  const mrr = activeSubscriptions.reduce((sum, row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return sum + (plan?.price_cents ?? 0);
  }, 0);

  const planNames = new Map((plans.data ?? []).map((plan) => [plan.id, plan.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Visão geral"
        description="Indicadores consolidados de todos os estabelecimentos conectados ao PedidoFácil."
        action={
          <ButtonLink href="/admin/estabelecimentos" variant="secondary" size="sm">
            <Store className="h-4 w-4" /> Gerenciar estabelecimentos
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estabelecimentos"
          value={String(establishmentRows.length)}
          hint={`${activeEstablishments} ativos · ${blockedEstablishments} bloqueados`}
          icon={<Store className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Pedidos totais"
          value={String(orderRows.length)}
          hint={`${validOrders.length} pedidos válidos`}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Clientes cadastrados"
          value={String(customers.count ?? 0)}
          hint="Somando todas as bases"
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="MRR estimado"
          value={formatBRL(mrr)}
          hint={`${activeSubscriptions.length} assinaturas ativas`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Últimos estabelecimentos"
            description="Cadastros mais recentes na plataforma"
            action={
              <Link
                href="/admin/estabelecimentos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {(recent.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="Nenhum estabelecimento ainda"
              description="Cadastre o primeiro estabelecimento para começar a acompanhar os indicadores."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {(recent.data ?? []).map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      /m/{row.slug} · {planNames.get(row.plan_id ?? "") ?? "Sem plano"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>
                  <Badge tone={STATUS_TONE[row.status as EstablishmentStatus] ?? "slate"}>
                    {STATUS_LABEL[row.status as EstablishmentStatus] ?? row.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Volume transacionado" description="Pedidos válidos (sem cancelados)" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">GMV total</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{formatBRL(gmv)}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ticket médio</span>
                <span className="font-semibold text-slate-900">
                  {formatBRL(validOrders.length ? Math.round(gmv / validOrders.length) : 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Planos cadastrados</span>
                <span className="font-semibold text-slate-900">{plans.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pedidos cancelados</span>
                <span className="font-semibold text-slate-900">
                  {orderRows.length - validOrders.length}
                </span>
              </div>
            </div>
            <ButtonLink href="/admin/planos" variant="outline" size="sm" className="w-full">
              Gerenciar planos
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
