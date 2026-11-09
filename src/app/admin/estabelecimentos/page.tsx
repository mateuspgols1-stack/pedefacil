import { AdminEstablishments, type AdminEstablishmentRow } from "@/components/admin-establishments";
import { PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estabelecimentos · Administração" };

export default async function AdminEstablishmentsPage() {
  await requireSuperadmin();
  const supabase = await createClient();

  const [establishments, plans, orders] = await Promise.all([
    supabase
      .from("establishments")
      .select("id, name, slug, city, phone, status, plan_id, created_at, owner_id")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("id, name").order("sort_order"),
    supabase.from("orders").select("establishment_id"),
  ]);

  const rows = establishments.data ?? [];
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_id).filter(Boolean)));

  const owners = ownerIds.length
    ? await supabase.from("profiles").select("id, email").in("id", ownerIds)
    : { data: [] as Array<{ id: string; email: string | null }> };

  const ownerMap = new Map((owners.data ?? []).map((owner) => [owner.id, owner.email]));
  const orderCount = new Map<string, number>();
  for (const order of orders.data ?? []) {
    orderCount.set(order.establishment_id, (orderCount.get(order.establishment_id) ?? 0) + 1);
  }

  const mapped: AdminEstablishmentRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    phone: row.phone,
    status: row.status as EstablishmentStatus,
    plan_id: row.plan_id,
    created_at: row.created_at,
    ownerEmail: ownerMap.get(row.owner_id) ?? null,
    ordersCount: orderCount.get(row.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Estabelecimentos"
        description="Cadastre, edite, bloqueie e libere os estabelecimentos que usam o PedidoFácil."
      />
      <AdminEstablishments rows={mapped} plans={plans.data ?? []} />
    </div>
  );
}
