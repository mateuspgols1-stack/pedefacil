"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  error?: string | null;
  success?: string | null;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_PAYMENTS = ["pix", "cash", "card", "online"] as const;

async function uploadBrandImage(file: File | null, establishmentId: string, prefix: string) {
  if (!file || file.size === 0) return { url: null as string | null, error: null as string | null };
  if (!file.type.startsWith("image/")) return { url: null, error: "Envie um arquivo de imagem válido." };
  if (file.size > MAX_IMAGE_BYTES) return { url: null, error: "A imagem deve ter no máximo 4 MB." };

  const supabase = await createClient();
  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${establishmentId}/${prefix}-${crypto.randomUUID()}.${extension || "jpg"}`;

  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { url: null, error: `Falha no upload: ${error.message}` };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function updateIdentityAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireEstablishment();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const primaryColor = String(formData.get("primary_color") ?? "").trim();
  const logo = formData.get("logo");
  const cover = formData.get("cover");

  if (name.length < 2) return { error: "Informe o nome do estabelecimento." };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) {
    return { error: "O link deve ter de 3 a 50 caracteres: letras minúsculas, números e hífens." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return { error: "Cor inválida. Use o formato #ea580c." };
  }

  const supabase = await createClient();

  if (slug !== ctx.establishment.slug) {
    const { data: available, error: slugError } = await supabase.rpc("slug_available", { p_slug: slug });
    if (slugError) return { error: "Não foi possível validar o link. Tente novamente." };
    if (available === false) return { error: "Este link já está em uso por outro estabelecimento." };
  }

  const hasBrandFiles =
    (logo instanceof File && logo.size > 0) || (cover instanceof File && cover.size > 0);
  if (hasBrandFiles && !ctx.limits.features.branding) {
    return { error: "Logotipo e capa personalizados estão disponíveis no plano Premium." };
  }

  const logoUpload = await uploadBrandImage(logo as File | null, ctx.establishment.id, "logo");
  if (logoUpload.error) return { error: logoUpload.error };
  const coverUpload = await uploadBrandImage(cover as File | null, ctx.establishment.id, "cover");
  if (coverUpload.error) return { error: coverUpload.error };

  const payload: Record<string, unknown> = {
    name,
    slug,
    description: description || null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    address: address || null,
    city: city || null,
    primary_color: primaryColor,
    updated_at: new Date().toISOString(),
  };
  if (logoUpload.url) payload.logo_url = logoUpload.url;
  if (coverUpload.url) payload.cover_url = coverUpload.url;
  if (formData.get("remove_logo") !== null) payload.logo_url = null;
  if (formData.get("remove_cover") !== null) payload.cover_url = null;

  const { error } = await supabase
    .from("establishments")
    .update(payload)
    .eq("id", ctx.establishment.id);

  if (error) {
    if (error.code === "23505") return { error: "Este link já está em uso." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/painel", "layout");
  revalidatePath(`/cardapio/${slug}`);
  return { success: "Dados do estabelecimento atualizados." };
}

export async function updateOperationAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireEstablishment();

  const deliveryEnabled = formData.get("delivery_enabled") !== null;
  const pickupEnabled = formData.get("pickup_enabled") !== null;
  if (!deliveryEnabled && !pickupEnabled) {
    return { error: "Ative pelo menos entrega ou retirada." };
  }

  const deliveryFee = parseMoneyToCents(String(formData.get("delivery_fee") ?? "0")) ?? 0;
  const minOrder = parseMoneyToCents(String(formData.get("min_order") ?? "0")) ?? 0;
  const deliveryMinutes = Math.min(240, Math.max(5, Number(formData.get("estimated_delivery") ?? 45) || 45));
  const pickupMinutes = Math.min(240, Math.max(5, Number(formData.get("estimated_pickup") ?? 20) || 20));

  const paymentMethods = ALLOWED_PAYMENTS.filter((method) => formData.get(`payment_${method}`) !== null);
  if (paymentMethods.length === 0) return { error: "Selecione ao menos uma forma de pagamento." };

  const openRaw = String(formData.get("is_open_override") ?? "");
  const isOpenOverride = openRaw === "true" ? true : openRaw === "false" ? false : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("establishments")
    .update({
      delivery_enabled: deliveryEnabled,
      pickup_enabled: pickupEnabled,
      delivery_fee_cents: deliveryFee,
      min_order_cents: minOrder,
      estimated_delivery_minutes: deliveryMinutes,
      estimated_pickup_minutes: pickupMinutes,
      payment_methods: paymentMethods,
      is_open_override: isOpenOverride,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.establishment.id);

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/painel", "layout");
  revalidatePath(`/cardapio/${ctx.establishment.slug}`);
  return { success: "Configurações de entrega e pagamento salvas." };
}

export async function updateHoursAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireEstablishment();
  const supabase = await createClient();

  const rows: Array<{
    establishment_id: string;
    weekday: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
  }> = [];

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const closed = formData.get(`closed_${weekday}`) !== null;
    const open = String(formData.get(`open_${weekday}`) ?? "").trim();
    const close = String(formData.get(`close_${weekday}`) ?? "").trim();

    if (!closed && (!open || !close)) {
      return { error: "Preencha os horários de abertura e fechamento dos dias abertos." };
    }

    rows.push({
      establishment_id: ctx.establishment.id,
      weekday,
      is_closed: closed,
      open_time: closed ? null : open,
      close_time: closed ? null : close,
    });
  }

  const { error } = await supabase
    .from("business_hours")
    .upsert(rows, { onConflict: "establishment_id,weekday" });

  if (error) return { error: `Não foi possível salvar os horários: ${error.message}` };

  revalidatePath("/painel/configuracoes");
  revalidatePath(`/cardapio/${ctx.establishment.slug}`);
  return { success: "Horários de funcionamento atualizados." };
}
