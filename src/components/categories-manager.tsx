"use client";

import { FolderTree, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryState,
} from "@/app/painel/categorias/actions";
import { Alert, Badge, Button, Field, Input, Textarea } from "@/components/ui";

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  productCount: number;
}

const INITIAL: CategoryState = { error: null, success: null };

function CategoryDialog({
  category,
  onClose,
}: {
  category: CategoryRow | null;
  onClose: () => void;
}) {
  const action = category ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {category ? "Editar categoria" : "Nova categoria"}
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
          {category ? <input type="hidden" name="id" value={category.id} /> : null}
          <Field label="Nome *">
            <Input name="name" required defaultValue={category?.name ?? ""} placeholder="Ex.: Pizzas" />
          </Field>
          <Field label="Descrição">
            <Textarea
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder="Opcional"
            />
          </Field>
          {category ? (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={category.is_active}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Visível no cardápio
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

export function CategoriesManager({
  categories,
  maxCategories,
  planName,
}: {
  categories: CategoryRow[];
  maxCategories: number | null;
  planName: string;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; category: CategoryRow | null }>({
    open: false,
    category: null,
  });

  const limitReached = maxCategories !== null && categories.length >= maxCategories;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {categories.length}
          {maxCategories !== null ? ` / ${maxCategories}` : ""} categoria(s)
        </span>
        <Button
          type="button"
          onClick={() => setDialog({ open: true, category: null })}
          disabled={limitReached}
          title={limitReached ? `Limite do plano ${planName} atingido` : undefined}
        >
          <Plus className="h-4 w-4" /> Nova categoria
        </Button>
      </div>

      {limitReached ? (
        <Alert tone="amber">
          Limite de {maxCategories} categorias do plano {planName} atingido.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.length === 0 ? (
          <div className="card-base col-span-full px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderTree className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-900">Nenhuma categoria cadastrada</p>
            <p className="mt-1 text-sm text-slate-500">
              Categorias ajudam o cliente a encontrar os produtos mais rápido.
            </p>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="card-base flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {category.description ?? "Sem descrição"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, category })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Editar ${category.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <form
                    action={deleteCategoryAction}
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          `Excluir "${category.name}"? Os produtos ficarão sem categoria.`,
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Excluir ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="slate">{category.productCount} produto(s)</Badge>
                {category.is_active ? <Badge tone="green">Visível</Badge> : <Badge tone="amber">Oculta</Badge>}
              </div>
            </div>
          ))
        )}
      </div>

      {dialog.open ? (
        <CategoryDialog
          category={dialog.category}
          onClose={() => setDialog({ open: false, category: null })}
        />
      ) : null}
    </>
  );
}
