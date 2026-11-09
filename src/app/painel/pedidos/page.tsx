import { OrdersBoard, type OrderRow } from "@/components/orders-board";
import { PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { publicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos" };

interface RawOrder extends Omit<OrderRow, "items"> {
  order_items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    notes: string | null;
  }>;
}

export default async function OrdersPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, customer_name, customer_phone, fulfillment, address, payment_method, status, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, notes, created_at, order_items(id, name, quantity, unit_price_cents, total_cents, notes)",
    )
    .eq("establishment_id", ctx.establishment.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const orders: OrderRow[] = ((data ?? []) as RawOrder[]).map((order) => ({
    ...order,
    items: order.order_items ?? [],
  }));

  const config = publicSupabaseConfig;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operação"
        title="Pedidos"
        description="Acompanhe e atualize os pedidos do cardápio digital em tempo real."
      />
      <OrdersBoard
        orders={orders}
        establishmentId={ctx.establishment.id}
        supabaseUrl={config.url}
        supabaseAnonKey={config.anonKey}
      />
    </div>
  );
}
