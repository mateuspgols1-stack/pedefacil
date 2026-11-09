import { CheckCircle2, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { SignupForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const metadata = { title: "Criar conta" };

const BENEFITS = [
  "Cardápio digital com link exclusivo",
  "Pedidos ilimitados no painel em tempo real",
  "Gestão de produtos, clientes e relatórios",
  "14 dias grátis no plano Básico",
];

export default function SignupPage() {
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
          <Link href="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center gap-10 px-4 py-10 lg:items-center">
        <div className="hidden max-w-sm lg:block">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Comece a vender online hoje
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Crie sua conta e seu estabelecimento já sai configurado com cardápio, horários e
            recebimento de pedidos.
          </p>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-md">
          <Card className="p-6 sm:p-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Criar conta grátis</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sem cartão de crédito. Configure seu cardápio em poucos minutos.
            </p>
            <div className="mt-6">
              <SignupForm />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
