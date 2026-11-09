import { AdminSubscriptions, type AdminSubscriptionRow } from "@/components/admin-subscriptions";
import { Alert, PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assinaturas · Administração" };

export default async function AdminSubscriptionsPage() {
  await requireSuperadmin();
  const supabase = await createClient();

  const [establishments, plans, subscriptions] = await Promise.all([
    supabase.from("establishments").select("id, name, slug, plan_id").order("name"),
    supabase.from("plans").select("id, name, price_cents").order("sort_order"),
    supabase
      .from("subscriptions")
      .select("id, establishment_id, plan_id, status, current_period_end, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const planList = plans.data ?? [];
  const priceByPlan = new Map(planList.map((plan) => [plan.id, plan.price_cents]));

  const latestByEstablishment = new Map<string, NonNullable<typeof subscriptions.data>[number]>();
  for (const subscription of subscriptions.data ?? []) {
    if (!latestByEstablishment.has(subscription.establishment_id)) {
      latestByEstablishment.set(subscription.establishment_id, subscription);
    }
  }

  const rows: AdminSubscriptionRow[] = (establishments.data ?? []).map((establishment) => {
    const subscription = latestByEstablishment.get(establishment.id);
    const planId = subscription?.plan_id ?? establishment.plan_id;
    return {
      establishmentId: establishment.id,
      establishmentName: establishment.name,
      slug: establishment.slug,
      planId,
      status: subscription?.status ?? "active",
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      mrrCents: priceByPlan.get(planId ?? "") ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monetização"
        title="Assinaturas"
        description="Acompanhe o plano contratado por cada estabelecimento, a situação da mensalidade e o vencimento."
      />

      {planList.length === 0 ? (
        <Alert tone="amber">
          Nenhum plano cadastrado. Execute <code>supabase/migrations/0004_seed.sql</code> no SQL Editor
          do Supabase para criar os planos da plataforma.
        </Alert>
      ) : null}

      <AdminSubscriptions rows={rows} plans={planList} />
    </div>
  );
}
