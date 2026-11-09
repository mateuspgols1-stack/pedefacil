import { AdminPlans, type AdminPlanRow } from "@/components/admin-plans";
import { Alert, PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos · Administração" };

export default async function AdminPlansPage() {
  await requireSuperadmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("plans")
    .select("id, code, name, description, price_cents, max_products, max_categories, features, is_active")
    .order("sort_order");

  const plans: AdminPlanRow[] = (data ?? []).map((plan) => ({
    ...plan,
    features: (plan.features ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monetização"
        title="Planos e assinaturas"
        description="Defina preço e recursos de cada plano. Os limites são aplicados automaticamente no painel dos estabelecimentos."
      />

      {plans.length === 0 ? (
        <Alert tone="amber">
          Nenhum plano encontrado. Execute o arquivo <code>supabase/migrations/0004_seed.sql</code> no
          SQL Editor do Supabase para criar os planos Básico, Profissional e Premium.
        </Alert>
      ) : (
        <AdminPlans plans={plans} />
      )}
    </div>
  );
}
