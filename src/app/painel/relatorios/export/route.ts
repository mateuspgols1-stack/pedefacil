import { NextResponse } from "next/server";

import { requireEstablishment } from "@/lib/auth";
import { PAYMENT_LABELS, FULFILLMENT_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const ctx = await requireEstablishment();
  if (!ctx.limits.features.reports) {
    return NextResponse.json({ error: "Recurso disponível no plano Premium." }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("dias") ?? 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "code, created_at, customer_name, customer_phone, fulfillment, payment_method, status, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, coupon_code",
    )
    .eq("establishment_id", ctx.establishment.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const header = [
    "codigo",
    "data",
    "cliente",
    "telefone",
    "tipo",
    "pagamento",
    "status",
    "subtotal",
    "entrega",
    "desconto",
    "total",
    "cupom",
  ];

  const lines = [header.join(";")];
  for (const order of data ?? []) {
    lines.push(
      [
        order.code,
        new Date(order.created_at).toLocaleString("pt-BR"),
        order.customer_name,
        order.customer_phone,
        FULFILLMENT_LABELS[order.fulfillment] ?? order.fulfillment,
        PAYMENT_LABELS[order.payment_method] ?? order.payment_method,
        order.status,
        (order.subtotal_cents / 100).toFixed(2).replace(".", ","),
        (order.delivery_fee_cents / 100).toFixed(2).replace(".", ","),
        (order.discount_cents / 100).toFixed(2).replace(".", ","),
        (order.total_cents / 100).toFixed(2).replace(".", ","),
        order.coupon_code ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  const slug = ctx.establishment.slug;
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${slug}-${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
