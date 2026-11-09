"use client";

import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShoppingBag,
  Tags,
  Ticket,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/painel/produtos", label: "Produtos", icon: UtensilsCrossed },
  { href: "/painel/categorias", label: "Categorias", icon: Tags },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
  { href: "/painel/cupons", label: "Cupons", icon: Ticket },
  { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
];

export function PanelShell({
  children,
  establishmentName,
  slug,
  planName,
  userName,
  activeOrders,
  isSuperadmin,
}: {
  children: React.ReactNode;
  establishmentName: string;
  slug: string;
  planName: string;
  userName: string;
  activeOrders: number;
  isSuperadmin: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map((item) => {
        const active = item.href === "/painel" ? pathname === "/painel" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <item.icon className={cn("h-4.5 w-4.5", active ? "text-brand-600" : "text-slate-400")} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/painel/pedidos" && activeOrders > 0 ? (
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeOrders}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">PedidoFácil</p>
          <p className="truncate text-[11px] text-slate-500">Painel do estabelecimento</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Estabelecimento
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{establishmentName}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
            Plano {planName}
          </span>
          <Link
            href={`/m/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-600"
          >
            Ver cardápio <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {nav}

      <div className="border-t border-slate-100 p-3">
        {isSuperadmin ? (
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Shield className="h-4.5 w-4.5 text-slate-400" />
            Administração
            <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
          </Link>
        ) : null}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
            {userName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "PF"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{userName}</p>
            <p className="text-[10px] text-slate-400">Conta conectada</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600"
            aria-label="Abrir menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-900">{establishmentName}</span>
          <Link
            href={`/m/${slug}`}
            target="_blank"
            className="ml-auto rounded-lg border border-slate-200 p-2 text-slate-500"
            aria-label="Ver cardápio"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
