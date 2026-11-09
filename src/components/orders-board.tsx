"use client";

import { Bike, Clock, MapPin, Phone, Radio, ShoppingBag, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cancelOrderAction, updateOrderStatusAction } from "@/app/painel/pedidos/actions";
import { Button, EmptyState } from "@/components/ui";
import { formatBRL, formatDateTime, formatPhone, PAYMENT_LABELS, statusMeta } from "@/lib/format";
import { ACTIVE_STATUSES, nextStatus } from "@/lib/orders";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Fulfillment, OrderStatus, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface OrderItemRow {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
}

export interface OrderRow {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  address: string | null;
  payment_method: PaymentMethod;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  items: OrderItemRow[];
}

const TABS = [
  { key: "active", label: "Em andamento" },
  { key: "done", label: "Finalizados" },
  { key: "all", label: "Todos" },
] as const;

export function OrdersBoard({
  orders,
  establishmentId,
  supabaseUrl,
  supabaseAnonKey,
}: {
  orders: OrderRow[];
  establishmentId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    const supabase = createBrowserSupabase(supabaseUrl, supabaseAnonKey);
    const channel = supabase
      .channel(`orders-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [establishmentId, router, supabaseAnonKey, supabaseUrl]);

  const counts = useMemo(
    () => ({
      active: orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length,
      done: orders.filter((order) => !ACTIVE_STATUSES.includes(order.status)).length,
      all: orders.length,
    }),
    [orders],
  );

  const visible = useMemo(() => {
    if (tab === "active") return orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    if (tab === "done") return orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));
    return orders;
  }, [orders, tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === item.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-[11px] font-bold text-slate-400">{counts[item.key]}</span>
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Radio className={`h-3.5 w-3.5 ${live ? "text-emerald-500" : "text-slate-300"}`} />
          {live ? "Tempo real conectado" : "Conectando tempo real..."}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title={tab === "active" ? "Nenhum pedido em andamento" : "Nenhum pedido por aqui"}
          description="Os pedidos feitos no cardápio digital aparecem aqui automaticamente."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((order) => {
            const meta = statusMeta(order.status);
            const next = nextStatus(order.status, order.fulfillment);
            const isActive = ACTIVE_STATUSES.includes(order.status);
            return (
              <div key={order.id} className="card-base flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">#{order.code}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" /> {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                      meta.tone,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-400" /> {order.customer_name}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {formatPhone(order.customer_phone)}
                  </p>
                  <p className="flex items-start gap-1.5">
                    {order.fulfillment === "delivery" ? (
                      <Bike className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    ) : (
                      <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                    <span>
                      {order.fulfillment === "delivery" ? "Entrega" : "Retirada"}
                      {order.address ? ` · ${order.address}` : ""}
                    </span>
                  </p>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2 text-xs">
                      <span className="min-w-0 text-slate-700">
                        <span className="font-semibold text-slate-900">{item.quantity}x</span>{" "}
                        {item.name}
                        {item.notes ? (
                          <span className="block text-[11px] italic text-slate-500">{item.notes}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-700">
                        {formatBRL(item.total_cents)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatBRL(order.subtotal_cents)}</span>
                  </div>
                  {order.delivery_fee_cents > 0 ? (
                    <div className="flex justify-between text-slate-500">
                      <span>Entrega</span>
                      <span>{formatBRL(order.delivery_fee_cents)}</span>
                    </div>
                  ) : null}
                  {order.discount_cents > 0 ? (
                    <div className="flex justify-between text-emerald-600">
                      <span>Desconto</span>
                      <span>- {formatBRL(order.discount_cents)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatBRL(order.total_cents)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pagamento: {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                  </p>
                </div>

                {order.notes ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    Obs.: {order.notes}
                  </p>
                ) : null}

                {isActive ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {next ? (
                      <form action={updateOrderStatusAction}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value={next} />
                        <Button type="submit" size="sm">
                          {statusMeta(next).action}
                        </Button>
                      </form>
                    ) : null}
                    <form
                      action={cancelOrderAction}
                      onSubmit={(event) => {
                        if (!window.confirm(`Cancelar o pedido #${order.code}?`)) event.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={order.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Cancelar
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
