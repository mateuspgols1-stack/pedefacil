import { CategoriesManager, type CategoryRow } from "@/components/categories-manager";
import { PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();
  const limits = planLimits(ctx.plan);

  const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, is_active, sort_order")
      .eq("establishment_id", ctx.establishment.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("category_id")
      .eq("establishment_id", ctx.establishment.id),
  ]);

  const counts = new Map<string, number>();
  for (const product of (productsData ?? []) as Array<{ category_id: string | null }>) {
    if (!product.category_id) continue;
    counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
  }

  const categories: CategoryRow[] = (categoriesData ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    is_active: category.is_active,
    productCount: counts.get(category.id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cardápio"
        title="Categorias"
        description="Organize o cardápio em seções para facilitar a escolha do cliente."
      />
      <CategoriesManager
        categories={categories}
        maxCategories={limits.maxCategories}
        planName={limits.name}
      />
    </div>
  );
}
