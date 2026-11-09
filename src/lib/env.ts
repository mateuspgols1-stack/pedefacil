/**
 * Configuração do Supabase lida em tempo de execução no servidor.
 * As chaves públicas (URL + anon) são repassadas aos componentes de
 * cliente como props — nunca ficam embutidas no bundle de build.
 * A service_role NUNCA é enviada ao navegador.
 */
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const publicSupabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}
