import Link from "next/link";
import { Download, Sparkles } from "lucide-react";

import { OrdersChart, PaymentChart, RevenueChart } from "@/components/charts";
import { Alert, Badge, ButtonLink, PageHeader, StatCard } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { formatBRL, PAYMENT_LABELS, FULFILLMENT_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

interface RawOrder {
  id: string;
  total_cents: number;
  status: string;
  payment_method: string;
  fulfillment: string;
  created_at: string;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const ctx = await requireEstablishment();
  const params = await searchParams;
  const days = PERIODS.some((period) => String(period.days) === params.dias)
    ? Number(params.dias)
    : 30;

  if (!ctx.limits.features.reports) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Inteligência"
          title="Relatórios"
          description="Analise faturamento, produtos mais vendidos e formas de pagamento."
        />
        <div className="card-base p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Relatórios completos no plano Premium
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Seu plano atual é <strong>{ctx.limits.name}</strong>. Faça upgrade para acessar
                análises de faturamento, produtos mais vendidos, mix de pagamento e exportação CSV.
              </p>
              <ButtonLink href="/painel/configuracoes#plano" size="sm" className="mt-3">
                Ver planos
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, total_cents, status, payment_method, fulfillment, created_at")
    .eq("establishment_id", ctx.establishment.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const orders = (ordersData ?? []) as RawOrder[];
  const valid = orders.filter((order) => order.status !== "canceled");
  const canceled = orders.filter((order) => order.status === "canceled");
  const revenue = valid.reduce((sum, order) => sum + order.total_cents, 0);
  const avgTicket = valid.length > 0 ? Math.round(revenue / valid.length) : 0;

  // série diária
  const byDay = new Map<string, { vendas: number; pedidos: number }>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    byDay.set(key, { vendas: 0, pedidos: 0 });
  }
  for (const order of valid) {
    const key = order.created_at.slice(0, 10);
    const entry = byDay.get(key);
    if (entry) {
      entry.vendas += order.total_cents;
      entry.pedidos += 1;
    }
  }
  const series = Array.from(byDay.entries()).map(([key, value]) => ({
    label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
    vendas: value.vendas,
    pedidos: value.pedidos,
  }));

  // mix de pagamento
  const paymentMap = new Map<string, number>();
  for (const order of valid) {
    paymentMap.set(
      order.payment_method,
      (paymentMap.get(order.payment_method) ?? 0) + order.total_cents,
    );
  }
  const paymentSeries = Array.from(paymentMap.entries())
    .map(([method, total]) => ({ name: PAYMENT_LABELS[method] ?? method, value: total }))
    .sort((a, b) => b.value - a.value);

  // entregas vs retiradas
  const deliveryCount = valid.filter((order) => order.fulfillment === "delivery").length;
  const pickupCount = valid.filter((order) => order.fulfillment === "pickup").length;

  // produtos mais vendidos
  const orderIds = valid.slice(0, 500).map((order) => order.id);
  let topProducts: Array<{ name: string; quantity: number; total: number }> = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("product_name, quantity, total_cents")
      .in("order_id", orderIds);

    const productMap = new Map<string, { quantity: number; total: number }>();
    for (const item of (itemsData ?? []) as Array<{
      product_name: string;
      quantity: number;
      total_cents: number;
    }>) {
      const entry = productMap.get(item.product_name) ?? { quantity: 0, total: 0 };
      entry.quantity += item.quantity;
      entry.total += item.total_cents;
      productMap.set(item.product_name, entry);
    }
    topProducts = Array.from(productMap.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inteligência"
        title="Relatórios"
        description={`Desempenho dos últimos ${days} dias.`}
        action={
          <a
            href={`/painel/relatorios/export?dias=${days}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        }
      />

      <div className="flex gap-2">
        {PERIODS.map((period) => (
          <Link
            key={period.days}
            href={`/painel/relatorios?dias=${period.days}`}
            className={
              period.days === days
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            }
          >
            {period.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento" value={formatBRL(revenue)} hint="pedidos não cancelados" />
        <StatCard label="Pedidos" value={String(valid.length)} hint={`${canceled.length} cancelado(s)`} />
        <StatCard label="Ticket médio" value={formatBRL(avgTicket)} hint="por pedido" />
        <StatCard
          label="Entrega x Retirada"
          value={`${deliveryCount} / ${pickupCount}`}
          hint={FULFILLMENT_LABELS.delivery + " x " + FULFILLMENT_LABELS.pickup}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card-base p-5 xl:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Faturamento por dia</h2>
          <RevenueChart data={series} />
        </div>
        <div className="card-base p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-900">Formas de pagamento</h2>
          {paymentSeries.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Sem dados no período.</p>
          ) : (
            <>
              <PaymentChart data={paymentSeries} />
              <div className="space-y-1.5">
                {paymentSeries.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{entry.name}</span>
                    <span className="font-semibold text-slate-900">{formatBRL(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-base p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Pedidos por dia</h2>
          <OrdersChart data={series} />
        </div>

        <div className="card-base p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Produtos mais vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Sem dados no período.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                    <p className="text-[11px] text-slate-500">{product.quantity} un. vendidas</p>
                  </div>
                  <Badge tone="green">{formatBRL(product.total)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <Alert tone="slate">
          Nenhum pedido no período selecionado. Assim que os pedidos chegarem pelo cardápio
          digital, os indicadores serão preenchidos automaticamente.
        </Alert>
      ) : null}
    </div>
  );
}
