import { CustomersManager, type CustomerRow } from "@/components/customers-manager";
import { PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, notes, orders_count, total_spent_cents")
    .eq("establishment_id", ctx.establishment.id)
    .order("total_spent_cents", { ascending: false })
    .limit(300);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Sua base de clientes com histórico de pedidos e ticket acumulado."
      />
      <CustomersManager customers={(data ?? []) as CustomerRow[]} />
    </div>
  );
}
