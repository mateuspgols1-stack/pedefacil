import { CheckCircle2, Clock, MapPin, MessageCircle, Receipt, Store } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import {
  FULFILLMENT_LABELS,
  formatBRL,
  formatDateTime,
  PAYMENT_LABELS,
  statusMeta,
} from "@/lib/format";
import { ORDER_FLOW } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import type { Fulfillment, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acompanhar pedido · PedidoFácil" };

interface TrackedOrder {
  code: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  fulfillment: Fulfillment;
  payment_method: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  customer_name: string;
  address: string | null;
  establishment: {
    name: string;
    slug: string;
    whatsapp: string | null;
    phone: string | null;
  };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    notes: string | null;
  }>;
}

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  if (!isSupabaseConfigured) redirect("/setup");
  const { slug, code } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("track_order", { p_code: code });
  const order = (data as TrackedOrder | null) ?? null;

  if (!order || order.establishment.slug !== slug) notFound();

  const meta = statusMeta(order.status);
  const cancelled = order.status === "canceled";
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <AutoRefresh seconds={20} />
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href={`/m/${slug}`} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            ← Voltar ao cardápio
          </Link>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pedido
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.code}</h1>
              <p className="mt-1 text-sm text-slate-500">{order.establishment.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-xl font-bold text-slate-900">{formatBRL(order.total_cents)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {formatDateTime(order.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {order.fulfillment === "delivery" ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <Store className="h-3.5 w-3.5" />
              )}
              {FULFILLMENT_LABELS[order.fulfillment] ?? order.fulfillment}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
            </span>
          </div>

          {cancelled ? (
            <Alert tone="red" className="mt-4">
              Este pedido foi cancelado. Em caso de dúvida, fale com o estabelecimento.
            </Alert>
          ) : (
            <ol className="mt-5 space-y-3">
              {ORDER_FLOW.map((status, index) => {
                const step = statusMeta(status);
                const done = currentIndex >= index;
                return (
                  <li key={status} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          done ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {order.status === status ? (
                        <p className="text-xs text-slate-500">
                          Etapa atual · atualizado em {formatDateTime(order.updated_at)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="mt-4 text-[11px] text-slate-400">
            Esta página se atualiza automaticamente a cada 20 segundos.
          </p>
        </Card>

        <Card className="mt-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Itens</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {order.items.map((item, index) => (
              <li key={`${item.product_name}-${index}`} className="flex justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {item.quantity}× {item.product_name}
                  </p>
                  {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {formatBRL(item.total_cents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatBRL(order.subtotal_cents)}</span>
            </div>
            {order.discount_cents > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>Desconto</span>
                <span>−{formatBRL(order.discount_cents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-slate-600">
              <span>Entrega</span>
              <span>{order.delivery_fee_cents > 0 ? formatBRL(order.delivery_fee_cents) : "Grátis"}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatBRL(order.total_cents)}</span>
            </div>
          </div>

          {order.address ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-semibold">Entrega:</span> {order.address}
            </p>
          ) : null}
        </Card>

        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={`/m/${slug}`} variant="outline">
            Fazer novo pedido
          </ButtonLink>
          {order.establishment.whatsapp ? (
            <a
              href={`https://wa.me/55${order.establishment.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Olá! Sobre o pedido ${order.code}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
