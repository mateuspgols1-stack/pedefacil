"use client";

import { Loader2, Pencil, Plus, Ticket, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponAction,
  updateCouponAction,
  type CouponState,
} from "@/app/painel/cupons/actions";
import { Alert, Badge, Button, Field, Input, Select } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { centsToInput } from "@/lib/money";

export interface CouponRow {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_cents: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

const INITIAL: CouponState = { error: null, success: null };

function CouponDialog({ coupon, onClose }: { coupon: CouponRow | null; onClose: () => void }) {
  const action = coupon ? updateCouponAction : createCouponAction;
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [type, setType] = useState<"percent" | "fixed">(coupon?.discount_type ?? "percent");

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {coupon ? "Editar cupom" : "Novo cupom"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-5">
          {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

          <Field label="Código do cupom *" hint="O cliente digita este código no checkout.">
            <Input
              name="code"
              required
              defaultValue={coupon?.code ?? ""}
              placeholder="BEMVINDO10"
              className="uppercase"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de desconto">
              <Select
                name="discount_type"
                value={type}
                onChange={(event) => setType(event.target.value as "percent" | "fixed")}
              >
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </Select>
            </Field>
            <Field label={type === "percent" ? "Desconto (%) *" : "Desconto (R$) *"}>
              <Input
                name="discount_value"
                required
                inputMode="decimal"
                defaultValue={
                  coupon
                    ? coupon.discount_type === "percent"
                      ? String(coupon.discount_value)
                      : centsToInput(coupon.discount_value)
                    : ""
                }
                placeholder={type === "percent" ? "10" : "5,00"}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pedido mínimo (R$)">
              <Input
                name="min_order"
                inputMode="decimal"
                defaultValue={centsToInput(coupon?.min_order_cents ?? 0)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Limite de usos" hint="Deixe vazio para ilimitado.">
              <Input
                name="max_uses"
                type="number"
                min={1}
                defaultValue={coupon?.max_uses ?? ""}
                placeholder="100"
              />
            </Field>
          </div>

          <Field label="Válido até" hint="Deixe vazio para não expirar.">
            <Input
              name="expires_at"
              type="date"
              defaultValue={coupon?.expires_at ? coupon.expires_at.slice(0, 10) : ""}
            />
          </Field>

          {coupon ? (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={coupon.is_active}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Cupom ativo
            </label>
          ) : null}

          {state.error ? <Alert tone="red">{state.error}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; coupon: CouponRow | null }>({
    open: false,
    coupon: null,
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{coupons.length} cupom(ns) cadastrado(s)</span>
        <Button type="button" onClick={() => setDialog({ open: true, coupon: null })}>
          <Plus className="h-4 w-4" /> Novo cupom
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="card-base px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Ticket className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-900">Nenhum cupom criado</p>
          <p className="mt-1 text-sm text-slate-500">
            Crie códigos promocionais para atrair e fidelizar clientes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="card-base flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide text-slate-900">
                    {coupon.code}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {coupon.discount_type === "percent"
                      ? `${coupon.discount_value}% de desconto`
                      : `${formatBRL(coupon.discount_value)} de desconto`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, coupon })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Editar ${coupon.code}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <form
                    action={deleteCouponAction}
                    onSubmit={(event) => {
                      if (!window.confirm(`Excluir o cupom ${coupon.code}?`)) event.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={coupon.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Excluir ${coupon.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-500">
                <p>Pedido mínimo: {formatBRL(coupon.min_order_cents)}</p>
                <p>
                  Usos: {coupon.used_count}
                  {coupon.max_uses ? ` / ${coupon.max_uses}` : " (ilimitado)"}
                </p>
                <p>Validade: {coupon.expires_at ? formatDate(coupon.expires_at) : "sem prazo"}</p>
              </div>

              <div className="flex items-center justify-between">
                {coupon.is_active ? <Badge tone="green">Ativo</Badge> : <Badge tone="slate">Inativo</Badge>}
                <form action={toggleCouponAction}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <input type="hidden" name="is_active" value={String(!coupon.is_active)} />
                  <button
                    type="submit"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {coupon.is_active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog.open ? (
        <CouponDialog coupon={dialog.coupon} onClose={() => setDialog({ open: false, coupon: null })} />
      ) : null}
    </>
  );
}
