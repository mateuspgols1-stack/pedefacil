"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string | null;
  success?: string | null;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

async function uploadProductImage(file: File | null, establishmentId: string) {
  if (!file || file.size === 0) return { url: null as string | null, error: null as string | null };
  if (!file.type.startsWith("image/")) return { url: null, error: "Envie um arquivo de imagem válido." };
  if (file.size > MAX_IMAGE_BYTES) return { url: null, error: "A imagem deve ter no máximo 4 MB." };

  const supabase = await createClient();
  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${establishmentId}/${crypto.randomUUID()}.${extension || "jpg"}`;

  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { url: null, error: `Falha no upload da imagem: ${error.message}` };

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

function readProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const price = parseMoneyToCents(String(formData.get("price") ?? ""));
  const promoRaw = String(formData.get("promo_price") ?? "").trim();
  const promoPrice = promoRaw ? parseMoneyToCents(promoRaw) : null;
  const isActive = formData.get("is_active") !== null;
  const isFeatured = formData.get("is_featured") !== null;

  if (name.length < 2) return { error: "Informe o nome do produto." } as const;
  if (price === null || price <= 0) return { error: "Informe um preço válido." } as const;
  if (promoRaw && (promoPrice === null || promoPrice <= 0)) {
    return { error: "Preço promocional inválido." } as const;
  }
  if (promoPrice !== null && promoPrice >= price) {
    return { error: "O preço promocional deve ser menor que o preço normal." } as const;
  }

  return {
    values: {
      name,
      description: description || null,
      category_id: categoryId || null,
      price_cents: price,
      promo_price_cents: promoPrice,
      is_active: isActive,
      is_featured: isFeatured,
    },
  } as const;
}

export async function createProductAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireEstablishment();
  const parsed = readProductForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const limits = planLimits(ctx.plan);

  if (limits.maxProducts !== null) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("establishment_id", ctx.establishment.id);
    if ((count ?? 0) >= limits.maxProducts) {
      return {
        error: `O plano ${limits.name} permite até ${limits.maxProducts} produtos. Faça upgrade para cadastrar mais.`,
      };
    }
  }

  const upload = await uploadProductImage(
    formData.get("image") instanceof File ? (formData.get("image") as File) : null,
    ctx.establishment.id,
  );
  if (upload.error) return { error: upload.error };

  const { error } = await supabase.from("products").insert({
    ...parsed.values,
    establishment_id: ctx.establishment.id,
    image_url: upload.url,
  });

  if (error) return { error: `Não foi possível salvar o produto: ${error.message}` };

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");
  return { success: "Produto cadastrado com sucesso." };
}

export async function updateProductAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireEstablishment();
  const productId = String(formData.get("id") ?? "");
  if (!productId) return { error: "Produto inválido." };

  const parsed = readProductForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const upload = await uploadProductImage(
    formData.get("image") instanceof File ? (formData.get("image") as File) : null,
    ctx.establishment.id,
  );
  if (upload.error) return { error: upload.error };

  const payload: Record<string, unknown> = { ...parsed.values };
  if (upload.url) payload.image_url = upload.url;
  if (String(formData.get("remove_image") ?? "") === "on") payload.image_url = null;

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .eq("establishment_id", ctx.establishment.id);

  if (error) return { error: `Não foi possível atualizar o produto: ${error.message}` };

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");
  return { success: "Produto atualizado." };
}

export async function toggleProductAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const productId = String(formData.get("id") ?? "");
  const nextValue = String(formData.get("is_active") ?? "true") === "true";
  if (!productId) return;

  const supabase = await createClient();
  await supabase
    .from("products")
    .update({ is_active: nextValue })
    .eq("id", productId)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");
}

export async function deleteProductAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const productId = String(formData.get("id") ?? "");
  if (!productId) return;

  const supabase = await createClient();
  await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");
}
