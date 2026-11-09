import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Link2,
  Menu as MenuIcon,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge, ButtonLink, Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { formatBRL } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FALLBACK_PLANS = [
  {
    code: "basic",
    name: "Básico",
    price_cents: 4990,
    description: "Para quem está começando a vender online.",
    max_products: 40,
    max_categories: 6,
    features: ["Cardápio digital com link próprio", "Pedidos ilimitados", "Gestão de clientes", "1 usuário"],
    highlighted: false,
  },
  {
    code: "pro",
    name: "Profissional",
    price_cents: 9990,
    description: "Para estabelecimentos que já vendem todos os dias.",
    max_products: 300,
    max_categories: 30,
    features: [
      "Tudo do Básico",
      "Cupons de desconto",
      "Relatórios de vendas",
      "Personalização de cores",
      "3 usuários",
    ],
    highlighted: true,
  },
  {
    code: "premium",
    name: "Premium",
    price_cents: 19990,
    description: "Operações com alto volume e múltiplas unidades.",
    max_products: null,
    max_categories: null,
    features: [
      "Tudo do Profissional",
      "Produtos e categorias ilimitados",
      "Destaque no cardápio",
      "Múltiplas unidades",
      "Suporte prioritário",
    ],
    highlighted: false,
  },
];

async function loadPlans() {
  if (!isSupabaseConfigured) return FALLBACK_PLANS;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const plans = (data ?? []) as Plan[];
    if (plans.length === 0) return FALLBACK_PLANS;
    return plans.map((plan) => ({
      code: plan.code,
      name: plan.name,
      price_cents: plan.price_cents,
      description: plan.description ?? "",
      max_products: plan.max_products,
      max_categories: plan.max_categories,
      features: [
        plan.max_products ? `Até ${plan.max_products} produtos` : "Produtos ilimitados",
        plan.max_categories ? `Até ${plan.max_categories} categorias` : "Categorias ilimitadas",
        plan.features?.coupons ? "Cupons de desconto" : "Pedidos ilimitados",
        plan.features?.reports ? "Relatórios de vendas" : "Gestão de clientes",
        plan.features?.branding ? "Personalização de cores" : "Link público do cardápio",
        plan.max_units > 1 ? `${plan.max_units} unidades` : "1 unidade",
      ],
      highlighted: plan.code === "pro",
    }));
  } catch {
    return FALLBACK_PLANS;
  }
}

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Cardápio digital próprio",
    text: "Cada estabelecimento recebe um link exclusivo, otimizado para celular, com fotos, categorias e preços.",
  },
  {
    icon: Zap,
    title: "Pedidos em tempo real",
    text: "Novos pedidos aparecem no painel na hora, com status, endereço, forma de pagamento e observações.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de vendas",
    text: "Faturamento por período, ticket médio, produtos mais vendidos e desempenho por forma de pagamento.",
  },
  {
    icon: Users,
    title: "Base de clientes",
    text: "Histórico de compras e contato de cada cliente, criado automaticamente a cada pedido.",
  },
  {
    icon: CreditCard,
    title: "Cupons e promoções",
    text: "Descontos percentuais ou fixos, com valor mínimo, limite de uso e validade configuráveis.",
  },
  {
    icon: ShieldCheck,
    title: "Isolamento total de dados",
    text: "Políticas RLS no Supabase garantem que cada estabelecimento acesse apenas os próprios dados.",
  },
];

export default async function LandingPage() {
  const plans = await loadPlans();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Pedido<span className="text-brand-600">Fácil</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#recursos" className="transition hover:text-slate-900">
              Recursos
            </a>
            <a href="#como-funciona" className="transition hover:text-slate-900">
              Como funciona
            </a>
            <a href="#planos" className="transition hover:text-slate-900">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Entrar
            </ButtonLink>
            <ButtonLink href="/cadastro" size="sm">
              Criar conta
            </ButtonLink>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,#ffedd5_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="mx-auto">
              <Zap className="h-3.5 w-3.5" /> Plataforma completa para food service
            </Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              Seu restaurante vendendo online,{" "}
              <span className="text-brand-600">sem complicação</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              PedidoFácil é o sistema de gestão de pedidos e cardápio digital para restaurantes,
              pizzarias, lanchonetes e marmitarias. Crie seu cardápio, compartilhe o link e receba
              pedidos direto no painel.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/cadastro" size="lg" className="w-full sm:w-auto">
                Começar agora — 14 dias grátis
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                Já tenho conta
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Sem cartão de crédito para testar. Cancele quando quiser.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <div className="card-base overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 truncate text-[11px] text-slate-400">
                  seurestaurante.pedidofacil.app/painel
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                {[
                  { label: "Vendas hoje", value: "R$ 1.842,50", icon: BarChart3, tone: "text-brand-600" },
                  { label: "Pedidos hoje", value: "37", icon: ShoppingBag, tone: "text-sky-600" },
                  { label: "Ticket médio", value: "R$ 49,80", icon: CreditCard, tone: "text-emerald-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.label}
                      </span>
                      <item.icon className={`h-4 w-4 ${item.tone}`} />
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <div className="space-y-2.5">
                  {[
                    { code: "#A1042", name: "Maria Souza", items: "Pizza Calabresa + Coca 2L", total: "R$ 78,00", status: "Em preparo" },
                    { code: "#A1041", name: "João Lima", items: "Marmita Executiva", total: "R$ 26,90", status: "Saiu para entrega" },
                    { code: "#A1040", name: "Ana Paula", items: "Combo X-Burger + Batata", total: "R$ 42,50", status: "Concluído" },
                  ].map((order) => (
                    <div
                      key={order.code}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {order.code} · {order.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{order.items}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-semibold text-slate-800">{order.total}</span>
                        <Badge tone={order.status === "Concluído" ? "slate" : "brand"}>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Exemplo ilustrativo da interface do painel.
            </p>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-t border-slate-100 bg-slate-50/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Recursos</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Tudo que o seu negócio precisa para vender
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Do cardápio ao relatório de faturamento, sem planilhas e sem depender de aplicativos de
              terceiros.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Como funciona
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              No ar em três passos
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Store,
                title: "1. Crie sua conta",
                text: "Cadastre o estabelecimento em menos de um minuto e receba seu link exclusivo de cardápio.",
              },
              {
                icon: MenuIcon,
                title: "2. Monte o cardápio",
                text: "Organize categorias, cadastre produtos com foto e preço e configure entrega, retirada e horários.",
              },
              {
                icon: Smartphone,
                title: "3. Receba pedidos",
                text: "Compartilhe o link nas redes sociais. Cada pedido chega no painel com status em tempo real.",
              },
            ].map((step) => (
              <Card key={step.title} className="p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-slate-100 bg-slate-50/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Planos</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Assinatura mensal, sem taxa por pedido
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Todos os planos incluem cardápio digital, pedidos ilimitados e painel de gestão.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-card ${
                  plan.highlighted ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200"
                }`}
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white">
                    Mais escolhido
                  </span>
                ) : null}
                <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 min-h-[40px] text-xs text-slate-500">{plan.description}</p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {formatBRL(plan.price_cents)}
                  </span>
                  <span className="text-xs text-slate-500">/mês</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/cadastro"
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  Assinar {plan.name}
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Pronto para receber pedidos online?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            Crie sua conta, monte o cardápio e comece a vender hoje mesmo. Configuração em minutos,
            suporte em português.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/cadastro" size="lg" className="w-full sm:w-auto">
              Criar minha conta
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="outline"
              size="lg"
              className="w-full border-slate-700 bg-transparent text-white hover:bg-slate-800 sm:w-auto"
            >
              Acessar painel
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="font-semibold text-slate-700">PedidoFácil</span>
            <span>· Gestão de pedidos para food service</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-800">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-slate-800">
              Criar conta
            </Link>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
