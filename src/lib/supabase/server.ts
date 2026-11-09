import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabaseConfigured, publicSupabaseConfig } from "@/lib/env";

/**
 * Cliente Supabase para Server Components / Server Actions.
 * Usa os cookies da sessão e respeita as políticas RLS do usuário logado.
 */
export async function createClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não podem escrever cookies; o middleware renova a sessão.
        }
      },
    },
  });
}
