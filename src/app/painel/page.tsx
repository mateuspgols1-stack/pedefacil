import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { OrdersChart, RevenueChart } from "@/components/charts";
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { buildDailySeries, daysAgoSP, percentChange, startOfMonthSP, startOfTodaySP } from "@/lib/dates";
import { formatBRL, formatDateTime, PAYMENT_LABELS, statusMeta } from "@/lib/format";
import { ACTIVE_STATUSES, isActiveOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

interface OrderRow {
  id: string;
  code: string;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  fulfillment: "delivery" | "pickup";
  customer_name: string;
  payment_method: string;
}

export default async function DashboardPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();
  const establishmentId = ctx.establishment.id;

  const since = daysAgoSP(29);
  const todayStart = startOfTodaySP();
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = startOfMonthSP();

  const [{ data: ordersData }, { count: customersCount }, { data: itemsData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, code, total_cents, status, created_at, fulfillment, customer_name, payment_method")
      .eq("establishment_id", establishmentId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("establishment_id", establishmentId),
    supabase
      .from("order_items")
      .select("product_name, quantity, total_cents, orders!inner(establishment_id, created_at, status)")
      .eq("orders.establishment_id", establishmentId)
      .gte("orders.created_at", monthStart.toISOString())
      .neq("orders.status", "canceled"),
  ]);

  const orders = (ordersData ?? []) as OrderRow[];
  const paidOrders = orders.filter((order) => order.status !== "canceled");

  const todayOrders = paidOrders.filter((order) => new Date(order.created_at) >= todayStart);
  const yesterdayOrders = paidOrders.filter(
    (order) => new Date(order.created_at) >= yesterdayStart && new Date(order.created_at) < todayStart,
  );
  const monthOrders = paidOrders.filter((order) => new Date(order.created_at) >= monthStart);

  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const revenueYesterday = yesterdayOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const revenueMonth = monthOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const ticketAverage = monthOrders.length > 0 ? Math.round(revenueMonth / monthOrders.length) : 0;
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));

  const dailySeries = buildDailySeries(orders, 14);
  const ordersSeries = dailySeries.map((day) => ({ label: day.label, pedidos: day.pedidos }));

  const topProducts = new Map<string, { quantity: number; total: number }>();
  for (const raw of (itemsData ?? []) as Array<{
    product_name: string;
    quantity: number;
    total_cents: number;
  }>) {
    const current = topProducts.get(raw.product_name) ?? { quantity: 0, total: 0 };
    topProducts.set(raw.product_name, {
      quantity: current.quantity + raw.quantity,
      total: current.total + raw.total_cents,
    });
  }
  const ranking = Array.from(topProducts.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const statusBreakdown = ACTIVE_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  })).filter((entry) => entry.count > 0);

  const recentOrders = orders.slice(0, 6);
  const todayChange = percentChange(revenueToday, revenueYesterday);
  const publicUrl = `/m/${ctx.establishment.slug}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão geral"
        title={`Olá, ${(ctx.profile.full_name ?? "bem-vindo").split(" ")[0]}`}
        description={`Acompanhe o desempenho de ${ctx.establishment.name} em tempo real.`}
        action={
          <>
            <ButtonLink href={publicUrl} target="_blank" variant="outline">
              Ver cardápio
            </ButtonLink>
            <ButtonLink href="/painel/pedidos">
              <ClipboardList className="h-4 w-4" /> Pedidos
              {activeOrders.length > 0 ? (
                <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                  {activeOrders.length}
                </span>
              ) : null}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vendas hoje"
          value={formatBRL(revenueToday)}
          hint={`${todayOrders.length} pedido(s) hoje`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Faturamento do mês"
          value={formatBRL(revenueMonth)}
          hint={`${monthOrders.length} pedido(s) no mês`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(ticketAverage)}
          hint="Média dos pedidos do mês"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Clientes cadastrados"
          value={String(customersCount ?? 0)}
          hint={`${activeOrders.length} pedido(s) em andamento`}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      {todayChange !== 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {todayChange > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
              <ArrowUpRight className="h-3.5 w-3.5" /> {todayChange}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
              <ArrowDownRight className="h-3.5 w-3.5" /> {Math.abs(todayChange)}%
            </span>
          )}
          <span>em relação a ontem ({formatBRL(revenueYesterday)})</span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Faturamento dos últimos 14 dias"
            description="Valores de pedidos não cancelados."
            action={<Badge tone="brand">Atualizado agora</Badge>}
          />
          <div className="px-2 py-4 sm:px-4">
            <RevenueChart data={dailySeries} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pedidos por dia" description="Volume diário de pedidos." />
          <div className="px-2 py-4 sm:px-4">
            <OrdersChart data={ordersSeries} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Últimos pedidos"
            description="Os pedidos mais recentes recebidos pelo cardápio digital."
            action={
              <Link
                href="/painel/pedidos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-6 w-6" />}
              title="Nenhum pedido ainda"
              description="Compartilhe o link do seu cardápio digital para começar a receber pedidos."
              action={
                <ButtonLink href={publicUrl} target="_blank" size="sm">
                  Abrir cardápio
                </ButtonLink>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => {
                const meta = statusMeta(order.status);
                return (
                  <Link
                    key={order.id}
                    href="/painel/pedidos"
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        #{order.code} · {order.customer_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatDateTime(order.created_at)} · {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatBRL(order.total_cents)}
                      </span>
                      <span
                        className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:inline-flex ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pedidos em andamento" description="Situação atual da operação." />
            <div className="space-y-3 p-5">
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum pedido em andamento agora.</p>
              ) : (
                statusBreakdown.map((entry) => {
                  const meta = statusMeta(entry.status);
                  return (
                    <div key={entry.status} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{entry.count}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Mais vendidos no mês" description="Ranking por faturamento." />
            {ranking.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Ainda sem vendas no período.</p>
            ) : (
              <div className="space-y-3 p-5">
                {ranking.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{product.name}</p>
                      <p className="text-[11px] text-slate-400">{product.quantity} un.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {formatBRL(product.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {isActiveOrder("pending") ? null : null}
    </div>
  );
}
