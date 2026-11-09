import { Ban } from "lucide-react";

import { ButtonLink, Card } from "@/components/ui";

export const metadata = { title: "Conta bloqueada" };

export default function BlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Ban className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Estabelecimento bloqueado</h1>
        <p className="mt-2 text-sm text-slate-600">
          O acesso ao painel está suspenso. Entre em contato com o suporte do PedidoFácil para
          regularizar a assinatura e liberar o estabelecimento.
        </p>
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/" variant="outline">
            Voltar ao site
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
