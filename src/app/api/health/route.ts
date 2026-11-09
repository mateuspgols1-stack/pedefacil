import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Sonda de saúde usada pelo container/hospedagem. */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      supabase_configured: isSupabaseConfigured,
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
