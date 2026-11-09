"use client";

import { Loader2, Lock, Mail, Phone, Store, User } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

const INITIAL: AuthState = { error: null, message: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="red">{state.error}</Alert> : null}
      {state.message ? <Alert tone="green">{state.message}</Alert> : null}
      <input type="hidden" name="next" value={next ?? "/painel"} />

      <Field label="E-mail">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@restaurante.com"
            className="pl-9"
          />
        </div>
      </Field>

      <Field label="Senha">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Entrar no painel
      </Button>

      <p className="text-center text-xs text-slate-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">
          Criar conta grátis
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="red">{state.error}</Alert> : null}
      {state.message ? <Alert tone="green">{state.message}</Alert> : null}

      <Field label="Seu nome">
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="full_name" required placeholder="Maria Silva" className="pl-9" autoComplete="name" />
        </div>
      </Field>

      <Field label="Nome do estabelecimento" hint="Será usado no seu link público do cardápio.">
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="establishment_name"
            required
            placeholder="Pizzaria Bella Massa"
            className="pl-9"
          />
        </div>
      </Field>

      <Field label="WhatsApp / telefone">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="phone" placeholder="(11) 99999-9999" className="pl-9" autoComplete="tel" />
        </div>
      </Field>

      <Field label="E-mail">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="email"
            type="email"
            required
            placeholder="voce@restaurante.com"
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </Field>

      <Field label="Senha" hint="Mínimo de 6 caracteres.">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            className="pl-9"
            autoComplete="new-password"
          />
        </div>
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Criar conta e começar
      </Button>

      <p className="text-center text-xs text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </form>
  );
}
