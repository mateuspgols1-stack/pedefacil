"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export interface CategoryState {
  error?: string | null;
  success?: string | null;
}

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim();
}

export async function createCategoryAction(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const ctx = await requireEstablishment();
  const name = readName(formData);
  if (name.length < 2) return { error: "Informe o nome da categoria." };

  const supabase = await createClient();
  const limits = planLimits(ctx.plan);

  if (limits.maxCategories !== null) {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("establishment_id", ctx.establishment.id);
    if ((count ?? 0) >= limits.maxCategories) {
      return {
        error: `O plano ${limits.name} permite até ${limits.maxCategories} categorias.`,
      };
    }
  }

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("establishment_id", ctx.establishment.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    establishment_id: ctx.establishment.id,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return { error: `Não foi possível criar a categoria: ${error.message}` };

  revalidatePath("/painel/categorias");
  revalidatePath("/painel/produtos");
  return { success: "Categoria criada." };
}

export async function updateCategoryAction(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  const name = readName(formData);
  if (!id) return { error: "Categoria inválida." };
  if (name.length < 2) return { error: "Informe o nome da categoria." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      is_active: formData.get("is_active") !== null,
    })
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  if (error) return { error: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/painel/categorias");
  revalidatePath("/painel/produtos");
  return { success: "Categoria atualizada." };
}

export async function deleteCategoryAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/categorias");
  revalidatePath("/painel/produtos");
}
