"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "canceled",
];

export async function updateOrderStatusAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !VALID.includes(status)) return;

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "canceled") patch.canceled_at = new Date().toISOString();

  await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/pedidos");
  revalidatePath("/painel");
}

export async function cancelOrderAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/pedidos");
  revalidatePath("/painel");
}
