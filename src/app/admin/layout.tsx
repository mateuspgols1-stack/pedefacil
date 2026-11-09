import { AdminShell } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração · PedidoFácil" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSuperadmin();
  const userName = ctx.profile.full_name ?? ctx.user.email ?? "Administrador";
  return <AdminShell userName={userName}>{children}</AdminShell>;
}
