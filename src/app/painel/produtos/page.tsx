import { UtensilsCrossed } from "lucide-react";

import { ProductsManager, type ProductRow } from "@/components/products-manager";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { requireEstablishment } from "@/lib/auth";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produtos" };

interface RawProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  categories: { name: string } | { name: string }[] | null;
}

export default async function ProductsPage() {
  const ctx = await requireEstablishment();
  const supabase = await createClient();
  const limits = planLimits(ctx.plan);

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, price_cents, promo_price_cents, image_url, is_active, is_featured, category_id, categories(name)",
      )
      .eq("establishment_id", ctx.establishment.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("establishment_id", ctx.establishment.id)
      .order("sort_order", { ascending: true }),
  ]);

  const products: ProductRow[] = ((productsData ?? []) as RawProduct[]).map((product) => {
    const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price_cents: product.price_cents,
      promo_price_cents: product.promo_price_cents,
      image_url: product.image_url,
      is_active: product.is_active,
      is_featured: product.is_featured,
      category_id: product.category_id,
      categoryName: category?.name ?? null,
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cardápio"
        title="Produtos"
        description="Gerencie os itens que aparecem no seu cardápio digital."
        action={
          <ButtonLink href={`/m/${ctx.establishment.slug}`} target="_blank" variant="outline">
            Ver cardápio
          </ButtonLink>
        }
      />

      {products.length === 0 && (categoriesData ?? []).length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="Comece pelas categorias"
          description="Crie categorias como Pizzas, Bebidas e Sobremesas para organizar o cardápio."
          action={
            <ButtonLink href="/painel/categorias" size="sm">
              Criar categorias
            </ButtonLink>
          }
        />
      ) : (
        <ProductsManager
          products={products}
          categories={categoriesData ?? []}
          maxProducts={limits.maxProducts}
          planName={limits.name}
        />
      )}
    </div>
  );
}
