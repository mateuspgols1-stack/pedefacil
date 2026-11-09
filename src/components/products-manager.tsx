"use client";

import { ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createProductAction,
  deleteProductAction,
  toggleProductAction,
  updateProductAction,
  type ActionResult,
} from "@/app/painel/produtos/actions";
import { Alert, Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { centsToInput } from "@/lib/money";

export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  categoryName: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const INITIAL: ActionResult = { error: null, success: null };

function ProductDialog({
  product,
  categories,
  onClose,
}: {
  product: ProductRow | null;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {product ? "Editar produto" : "Novo produto"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {product ? "Atualize as informações do item." : "Adicione um item ao seu cardápio."}
            </p>
          </div>
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
          {product ? <input type="hidden" name="id" value={product.id} /> : null}

          <Field label="Nome do produto *">
            <Input name="name" defaultValue={product?.name ?? ""} required placeholder="Ex.: Pizza Margherita" />
          </Field>

          <Field label="Descrição">
            <Textarea
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Ingredientes, tamanho, acompanhamentos..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preço (R$) *">
              <Input
                name="price"
                inputMode="decimal"
                required
                defaultValue={centsToInput(product?.price_cents)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Preço promocional (R$)" hint="Opcional — deve ser menor que o preço.">
              <Input
                name="promo_price"
                inputMode="decimal"
                defaultValue={centsToInput(product?.promo_price_cents)}
                placeholder="0,00"
              />
            </Field>
          </div>

          <Field label="Categoria">
            <Select name="category_id" defaultValue={product?.category_id ?? ""}>
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Imagem do produto" hint="JPG, PNG ou WebP com até 4 MB.">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
              <ImagePlus className="h-4 w-4" />
              <span>Selecionar imagem</span>
              <input type="file" name="image" accept="image/*" className="hidden" />
            </label>
            {product?.image_url ? (
              <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <input type="checkbox" name="remove_image" className="rounded border-slate-300" />
                Remover imagem atual
              </label>
            ) : null}
          </Field>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={product ? product.is_active : true}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Disponível no cardápio
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={product?.is_featured ?? false}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Destaque
            </label>
          </div>

          {state.error ? <Alert tone="red">{state.error}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {product ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductsManager({
  products,
  categories,
  maxProducts,
  planName,
}: {
  products: ProductRow[];
  categories: CategoryOption[];
  maxProducts: number | null;
  planName: string;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; product: ProductRow | null }>({
    open: false,
    product: null,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        (product.categoryName ?? "").toLowerCase().includes(term),
    );
  }, [products, query]);

  const limitReached = maxProducts !== null && products.length >= maxProducts;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {products.length}
            {maxProducts !== null ? ` / ${maxProducts}` : ""} produto(s)
          </span>
          <Button
            type="button"
            onClick={() => setDialog({ open: true, product: null })}
            disabled={limitReached}
            title={limitReached ? `Limite do plano ${planName} atingido` : undefined}
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        </div>
      </div>

      {limitReached ? (
        <Alert tone="amber">
          Você atingiu o limite de {maxProducts} produtos do plano {planName}. Altere o plano em
          Configurações para cadastrar mais itens.
        </Alert>
      ) : null}

      <div className="card-base divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre seu primeiro item para ele aparecer no cardápio digital.
            </p>
          </div>
        ) : (
          filtered.map((product) => {
            const price = product.promo_price_cents ?? product.price_cents;
            return (
              <div key={product.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    {product.is_featured ? <Badge tone="brand">Destaque</Badge> : null}
                    {product.is_active ? (
                      <Badge tone="green">Ativo</Badge>
                    ) : (
                      <Badge tone="slate">Inativo</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {product.categoryName ?? "Sem categoria"}
                    {product.description ? ` · ${product.description}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  {product.promo_price_cents ? (
                    <div>
                      <p className="text-sm font-bold text-brand-600">{formatBRL(price)}</p>
                      <p className="text-[11px] text-slate-400 line-through">
                        {formatBRL(product.price_cents)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-900">{formatBRL(price)}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, product })}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Editar ${product.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <form action={toggleProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="is_active" value={String(!product.is_active)} />
                    <button
                      type="submit"
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      {product.is_active ? "Pausar" : "Ativar"}
                    </button>
                  </form>
                  <form
                    action={deleteProductAction}
                    onSubmit={(event) => {
                      if (!window.confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Excluir ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {dialog.open ? (
        <ProductDialog
          product={dialog.product}
          categories={categories}
          onClose={() => setDialog({ open: false, product: null })}
        />
      ) : null}
    </>
  );
}
