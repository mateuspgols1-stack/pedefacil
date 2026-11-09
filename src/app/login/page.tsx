import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Pedido<span className="text-brand-600">Fácil</span>
            </span>
          </Link>
          <Link href="/cadastro" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="p-6 sm:p-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Acessar painel</h1>
            <p className="mt-1 text-sm text-slate-500">
              Entre com o e-mail e senha da sua conta para gerenciar pedidos e cardápio.
            </p>
            <div className="mt-6">
              <LoginForm next={params.next} />
            </div>
          </Card>
          <p className="mt-4 text-center text-xs text-slate-400">
            Ao entrar você concorda com os termos de uso da plataforma.
          </p>
        </div>
      </main>
    </div>
  );
}
