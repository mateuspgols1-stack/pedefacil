/** Fuso do Brasil (UTC-3) — usado para agrupar vendas por dia. */
export const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

export function startOfTodaySP() {
  const now = new Date();
  const sp = new Date(now.getTime() - SP_OFFSET_MS);
  sp.setUTCHours(0, 0, 0, 0);
  return new Date(sp.getTime() + SP_OFFSET_MS);
}

export function startOfMonthSP() {
  const start = startOfTodaySP();
  const sp = new Date(start.getTime() - SP_OFFSET_MS);
  sp.setUTCDate(1);
  return new Date(sp.getTime() + SP_OFFSET_MS);
}

export function daysAgoSP(days: number) {
  return new Date(startOfTodaySP().getTime() - days * 24 * 60 * 60 * 1000);
}

/** Rótulo curto dd/mm para gráficos. */
export function dayLabel(value: Date) {
  const sp = new Date(value.getTime() - SP_OFFSET_MS);
  return `${String(sp.getUTCDate()).padStart(2, "0")}/${String(sp.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dayKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const sp = new Date(date.getTime() - SP_OFFSET_MS);
  return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-${String(
    sp.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Série diária de faturamento e pedidos para os últimos N dias. */
export function buildDailySeries(
  orders: Array<{ created_at: string; total_cents: number; status: string }>,
  days: number,
) {
  const buckets = new Map<string, { label: string; vendas: number; pedidos: number }>();
  const start = daysAgoSP(days - 1);

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    buckets.set(dayKey(date), { label: dayLabel(date), vendas: 0, pedidos: 0 });
  }

  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.created_at));
    if (!bucket) continue;
    bucket.pedidos += 1;
    if (order.status !== "canceled") bucket.vendas += order.total_cents;
  }

  return Array.from(buckets.values());
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}
