"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { provisionEstablishment } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error: string | null;
  message?: string | null;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/painel";
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase não configurado neste ambiente. Veja a tela de configuração." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos. Verifique os dados e tente novamente." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase não configurado neste ambiente. Veja a tela de configuração." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const establishmentName = String(formData.get("establishment_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 3) return { error: "Informe seu nome completo." };
  if (establishmentName.length < 2) return { error: "Informe o nome do estabelecimento." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        establishment_name: establishmentName,
        phone,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Este e-mail já possui uma conta. Faça login para continuar." };
    }
    return { error: error.message };
  }

  if (!data.session) {
    return {
      error: null,
      message:
        "Conta criada! Confirme o e-mail enviado pelo Supabase para ativar o acesso e depois faça login.",
    };
  }

  await provisionEstablishment(supabase, {
    userId: data.user?.id ?? "",
    establishmentName,
    ownerName: fullName,
    phone,
  });

  revalidatePath("/", "layout");
  redirect("/painel");
}

export async function logoutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
