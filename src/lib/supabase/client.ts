"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o navegador (realtime).
 * Recebe URL/anon key por props para não depender de valores embutidos no build.
 */
export function createBrowserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
