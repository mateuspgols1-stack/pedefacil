"use server";

import { revalidatePath } from "next/cache";

import { requireEstablishment } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface CustomerState {
  error?: string | null;
  success?: string | null;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function createCustomerAction(
  _prev: CustomerState,
  formData: FormData,
): Promise<CustomerState> {
  const ctx = await requireEstablishment();
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (name.length < 2) return { error: "Informe o nome do cliente." };
  if (phone.length < 10) return { error: "Informe um telefone válido com DDD." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    establishment_id: ctx.establishment.id,
    name,
    phone,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) {
    if (error.code === "23505" || error.code === "23505".toString()) {
      return { error: "Já existe um cliente com este telefone." };
    }
    return { error: `Não foi possível cadastrar: ${error.message}` };
  }

  revalidatePath("/painel/clientes");
  return { success: "Cliente cadastrado." };
}

export async function updateCustomerAction(
  _prev: CustomerState,
  formData: FormData,
): Promise<CustomerState> {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!id) return { error: "Cliente inválido." };
  if (name.length < 2) return { error: "Informe o nome do cliente." };
  if (phone.length < 10) return { error: "Informe um telefone válido com DDD." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/painel/clientes");
  return { success: "Cliente atualizado." };
}

export async function deleteCustomerAction(formData: FormData) {
  const ctx = await requireEstablishment();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("establishment_id", ctx.establishment.id);

  revalidatePath("/painel/clientes");
}
