import { PanelShell } from "@/components/panel-shell";
import { isSuperadmin, requireEstablishment } from "@/lib/auth";
import { ACTIVE_STATUSES } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireEstablishment();
  const supabase = await createClient();

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("establishment_id", ctx.establishment.id)
    .in("status", ACTIVE_STATUSES);

  return (
    <PanelShell
      establishmentName={ctx.establishment.name}
      slug={ctx.establishment.slug}
      planName={ctx.plan.name}
      userName={ctx.profile.full_name ?? ctx.user.email ?? "Minha conta"}
      activeOrders={count ?? 0}
      isSuperadmin={isSuperadmin(ctx)}
    >
      {children}
    </PanelShell>
  );
}
