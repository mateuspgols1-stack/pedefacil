"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import {
  updateHoursAction,
  updateIdentityAction,
  updateOperationAction,
  type SettingsState,
} from "@/app/painel/configuracoes/actions";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { WEEKDAYS } from "@/lib/format";
import { centsToInput } from "@/lib/money";

const INITIAL: SettingsState = { error: null, success: null };

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) return <Alert tone="red">{state.error}</Alert>;
  if (state.success)
    return (
      <Alert tone="green">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-4 w-4" /> {state.success}
        </span>
      </Alert>
    );
  return null;
}

export interface IdentityValues {
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  primary_color: string;
  logo_url: string | null;
  cover_url: string | null;
}

export function IdentityForm({
  values,
  brandingEnabled,
}: {
  values: IdentityValues;
  brandingEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateIdentityAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do estabelecimento *">
          <Input name="name" required defaultValue={values.name} />
        </Field>
        <Field label="Link do cardápio *" hint={`seu-dominio.com/m/${values.slug}`}>
          <Input name="slug" required defaultValue={values.slug} className="lowercase" />
        </Field>
      </div>

      <Field label="Descrição" hint="Aparece no topo do cardápio digital.">
        <Textarea name="description" defaultValue={values.description ?? ""} rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input name="phone" defaultValue={values.phone ?? ""} placeholder="(11) 3333-4444" />
        </Field>
        <Field label="WhatsApp" hint="Somente números, com DDD.">
          <Input name="whatsapp" defaultValue={values.whatsapp ?? ""} placeholder="11999998888" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Endereço">
          <Input name="address" defaultValue={values.address ?? ""} placeholder="Rua, número, bairro" />
        </Field>
        <Field label="Cidade">
          <Input name="city" defaultValue={values.city ?? ""} placeholder="São Paulo" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cor principal" hint={brandingEnabled ? "Cor de destaque do seu cardápio." : "Disponível no plano Premium."}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              name="primary_color"
              defaultValue={values.primary_color}
              disabled={!brandingEnabled}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-slate-500">{values.primary_color}</span>
          </div>
        </Field>
        <div className="grid gap-4">
          <Field label="Logotipo" hint={brandingEnabled ? "PNG ou JPG até 4 MB." : "Disponível no plano Premium."}>
            <input
              type="file"
              name="logo"
              accept="image/*"
              disabled={!brandingEnabled}
              className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white disabled:opacity-60"
            />
          </Field>
          <Field label="Capa" hint={brandingEnabled ? "Imagem de fundo do cardápio." : "Disponível no plano Premium."}>
            <input
              type="file"
              name="cover"
              accept="image/*"
              disabled={!brandingEnabled}
              className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white disabled:opacity-60"
            />
          </Field>
        </div>
      </div>

      {values.logo_url || values.cover_url ? (
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {values.logo_url ? (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.logo_url} alt="Logotipo atual" className="h-10 w-10 rounded-lg object-cover" />
              <input type="checkbox" name="remove_logo" className="h-4 w-4 rounded border-slate-300" />
              Remover logotipo
            </label>
          ) : null}
          {values.cover_url ? (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.cover_url} alt="Capa atual" className="h-10 w-16 rounded-lg object-cover" />
              <input type="checkbox" name="remove_cover" className="h-4 w-4 rounded border-slate-300" />
              Remover capa
            </label>
          ) : null}
        </div>
      ) : null}

      <Feedback state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar dados
        </Button>
      </div>
    </form>
  );
}

export interface OperationValues {
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee_cents: number;
  min_order_cents: number;
  estimated_delivery_minutes: number;
  estimated_pickup_minutes: number;
  payment_methods: string[];
  is_open_override: boolean | null;
}

const PAYMENTS = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão na entrega" },
  { value: "online", label: "Pagamento online" },
];

export function OperationForm({ values }: { values: OperationValues }) {
  const [state, formAction, pending] = useActionState(updateOperationAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input
            type="checkbox"
            name="delivery_enabled"
            defaultChecked={values.delivery_enabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Entrega</span>
            <span className="block text-xs text-slate-500">Cliente recebe no endereço informado.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input
            type="checkbox"
            name="pickup_enabled"
            defaultChecked={values.pickup_enabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Retirada</span>
            <span className="block text-xs text-slate-500">Cliente retira no estabelecimento.</span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Taxa de entrega (R$)">
          <Input name="delivery_fee" inputMode="decimal" defaultValue={centsToInput(values.delivery_fee_cents)} />
        </Field>
        <Field label="Pedido mínimo (R$)">
          <Input name="min_order" inputMode="decimal" defaultValue={centsToInput(values.min_order_cents)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tempo médio de entrega (min)">
          <Input
            name="estimated_delivery"
            type="number"
            min={5}
            max={240}
            defaultValue={values.estimated_delivery_minutes}
          />
        </Field>
        <Field label="Tempo médio de retirada (min)">
          <Input
            name="estimated_pickup"
            type="number"
            min={5}
            max={240}
            defaultValue={values.estimated_pickup_minutes}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">Formas de pagamento aceitas</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENTS.map((payment) => (
            <label
              key={payment.value}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
            >
              <input
                type="checkbox"
                name={`payment_${payment.value}`}
                defaultChecked={values.payment_methods.includes(payment.value)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              {payment.label}
            </label>
          ))}
        </div>
      </div>

      <Field label="Status do cardápio" hint="Use fechado temporariamente quando a cozinha estiver sem capacidade.">
        <Select
          name="is_open_override"
          defaultValue={
            values.is_open_override === null ? "auto" : values.is_open_override ? "true" : "false"
          }
        >
          <option value="auto">Automático (segue os horários)</option>
          <option value="true">Aberto agora</option>
          <option value="false">Fechado agora</option>
        </Select>
      </Field>

      <Feedback state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar operação
        </Button>
      </div>
    </form>
  );
}

export interface HourRow {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export function HoursForm({ hours }: { hours: HourRow[] }) {
  const [state, formAction, pending] = useActionState(updateHoursAction, INITIAL);
  const byWeekday = new Map(hours.map((row) => [row.weekday, row]));

  return (
    <form action={formAction} className="space-y-3">
      {WEEKDAYS.map((label, weekday) => {
        const row = byWeekday.get(weekday);
        return (
          <div
            key={weekday}
            className="grid grid-cols-2 items-center gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <span className="text-xs font-semibold text-slate-800">{label}</span>
            <input
              type="time"
              name={`open_${weekday}`}
              defaultValue={row?.open_time?.slice(0, 5) ?? "18:00"}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
            />
            <input
              type="time"
              name={`close_${weekday}`}
              defaultValue={row?.close_time?.slice(0, 5) ?? "23:00"}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
            />
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <input
                type="checkbox"
                name={`closed_${weekday}`}
                defaultChecked={row?.is_closed ?? weekday === 0}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Fechado
            </label>
          </div>
        );
      })}

      <Feedback state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar horários
        </Button>
      </div>
    </form>
  );
}
