import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify } from "@/lib/format";
import type { Establishment } from "@/lib/types";

interface ProvisionInput {
  userId: string;
  establishmentName: string;
  ownerName?: string | null;
  phone?: string | null;
}

/**
 * Cria estabelecimento + vínculo do proprietário + assinatura de teste.
 * Usa o cliente autenticado: as políticas RLS permitem que o próprio
 * usuário crie o seu estabelecimento e o seu membership.
 */
export async function provisionEstablishment(
  supabase: SupabaseClient,
  input: ProvisionInput,
): Promise<{ establishment: Establishment | null; error: string | null }> {
  const base = slugify(input.establishmentName) || "meu-estabelecimento";
  let slug = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: available } = await supabase.rpc("slug_available", { p_slug: candidate });
    if (available) {
      slug = candidate;
      break;
    }
  }

  const { data: planRow } = await supabase
    .from("plans")
    .select("id")
    .eq("code", "basic")
    .maybeSingle();

  const { data: establishment, error } = await supabase
    .from("establishments")
    .insert({
      owner_id: input.userId,
      name: input.establishmentName.trim(),
      slug,
      phone: input.phone ?? null,
      plan_id: (planRow as { id: string } | null)?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !establishment) {
    return { establishment: null, error: error?.message ?? "Não foi possível criar o estabelecimento." };
  }

  const created = establishment as Establishment;

  await supabase.from("memberships").insert({
    establishment_id: created.id,
    user_id: input.userId,
    role: "owner",
  });

  if (planRow) {
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("subscriptions").insert({
      establishment_id: created.id,
      plan_id: (planRow as { id: string }).id,
      status: "trialing",
      trial_ends_at: trialEnds,
      current_period_end: trialEnds,
    });
  }

  await supabase.rpc("seed_default_hours", { p_establishment_id: created.id });

  return { establishment: created, error: null };
}
