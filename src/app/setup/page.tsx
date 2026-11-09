import { Database, ExternalLink, KeyRound, Terminal } from "lucide-react";

import { Alert, ButtonLink, Card, CardHeader } from "@/components/ui";

export const metadata = { title: "Configuração inicial" };

const STEPS = [
  {
    icon: Database,
    title: "1. Crie o projeto no Supabase",
    text: "Acesse supabase.com, crie um projeto e abra o SQL Editor.",
  },
  {
    icon: Terminal,
    title: "2. Execute as migrações",
    text: "Rode, nesta ordem, os arquivos supabase/migrations/0001_schema.sql, 0002_rls.sql, 0003_functions.sql e 0004_seed.sql.",
  },
  {
    icon: KeyRound,
    title: "3. Configure as variáveis",
    text: "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (Project Settings → API) nas variáveis de ambiente do projeto.",
  },
];

export default function SetupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader
          title="PedidoFácil — configuração pendente"
          description="O app está pronto, mas ainda não encontrou as credenciais do Supabase."
        />
        <div className="space-y-5 p-5">
          <Alert tone="amber">
            As variáveis <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> não estão
            definidas neste ambiente. Sem elas não é possível autenticar usuários nem ler o banco.
          </Alert>

          <div className="space-y-3">
            {STEPS.map((step) => (
              <div key={step.title} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <step.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <Alert tone="slate">
            <span className="font-semibold">Chave secreta:</span> a{" "}
            <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> é opcional e deve
            existir apenas no servidor. Nunca use o prefixo <code className="font-mono text-xs">NEXT_PUBLIC_</code>{" "}
            nela.
          </Alert>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/" variant="outline">
              Voltar ao site
            </ButtonLink>
            <ButtonLink
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              variant="secondary"
            >
              Abrir Supabase <ExternalLink className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
