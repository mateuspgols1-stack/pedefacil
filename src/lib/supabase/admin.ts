import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Cliente administrativo (service role). Só deve ser usado no servidor,
 * em rotinas que exigem privilégio total (ex.: criação de estabelecimento
 * para um usuário recém-cadastrado). Nunca importe isto em componentes
 * de cliente.
 */
export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
