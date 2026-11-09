"use client";

import { Loader2, Mail, MapPin, Pencil, Plus, Search, Trash2, User, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
  type CustomerState,
} from "@/app/painel/clientes/actions";
import { Alert, Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { formatBRL, formatPhone } from "@/lib/format";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  orders_count: number;
  total_spent_cents: number;
}

const INITIAL: CustomerState = { error: null, success: null };

function CustomerDialog({
  customer,
  onClose,
}: {
  customer: CustomerRow | null;
  onClose: () => void;
}) {
  const action = customer ? updateCustomerAction : createCustomerAction;
  const [state, formAction, pending] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {customer ? "Editar cliente" : "Novo cliente"}
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
          {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
          <Field label="Nome *">
            <Input name="name" required defaultValue={customer?.name ?? ""} placeholder="Nome do cliente" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone *">
              <Input
                name="phone"
                required
                defaultValue={customer?.phone ?? ""}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="E-mail">
              <Input
                name="email"
                type="email"
                defaultValue={customer?.email ?? ""}
                placeholder="cliente@email.com"
              />
            </Field>
          </div>
          <Field label="Endereço">
            <Textarea
              name="address"
              defaultValue={customer?.address ?? ""}
              placeholder="Rua, número, bairro, cidade"
            />
          </Field>
          <Field label="Observações">
            <Textarea name="notes" defaultValue={customer?.notes ?? ""} placeholder="Preferências, alergias..." />
          </Field>
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

export function CustomersManager({ customers }: { customers: CustomerRow[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; customer: CustomerRow | null }>({
    open: false,
    customer: null,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) || customer.phone.includes(term),
    );
  }, [customers, query]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={() => setDialog({ open: true, customer: null })}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card-base px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <User className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-900">Nenhum cliente encontrado</p>
          <p className="mt-1 text-sm text-slate-500">
            Os clientes que pedirem pelo cardápio digital são cadastrados automaticamente.
          </p>
        </div>
      ) : (
        <div className="card-base divide-y divide-slate-100">
          {filtered.map((customer) => (
            <div key={customer.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{customer.name}</p>
                <p className="truncate text-xs text-slate-500">{formatPhone(customer.phone)}</p>
              </div>
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate text-xs text-slate-500">
                  {customer.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {customer.email}
                    </span>
                  ) : customer.address ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {customer.address}
                    </span>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="slate">{customer.orders_count} pedido(s)</Badge>
                <span className="text-xs font-bold text-slate-700">
                  {formatBRL(customer.total_spent_cents)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDialog({ open: true, customer })}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Editar ${customer.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form
                  action={deleteCustomerAction}
                  onSubmit={(event) => {
                    if (!window.confirm(`Excluir o cliente "${customer.name}"?`)) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="id" value={customer.id} />
                  <button
                    type="submit"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Excluir ${customer.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog.open ? (
        <CustomerDialog
          customer={dialog.customer}
          onClose={() => setDialog({ open: false, customer: null })}
        />
      ) : null}
    </>
  );
}
