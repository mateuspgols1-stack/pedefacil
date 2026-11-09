"use client";

import {
  ChevronLeft,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createOrderAction,
  validateCouponAction,
  type CheckoutState,
} from "@/app/m/[slug]/actions";
import { Alert, Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formatBRL, PAYMENT_LABELS } from "@/lib/format";
import { cartSubtotal, clampQuantity, type CartLine } from "@/lib/pricing";

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  image_url: string | null;
  category_id: string | null;
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicEstablishment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee_cents: number;
  min_order_cents: number;
  estimated_delivery_minutes: number;
  estimated_pickup_minutes: number;
  payment_methods: string[];
}

interface AppliedCoupon {
  code: string;
  discountCents: number;
  message: string;
}

function productPrice(product: PublicProduct) {
  return product.promo_price_cents ?? product.price_cents;
}

export function MenuClient({
  establishment,
  categories,
  products,
  isOpen,
  hoursLabel,
}: {
  establishment: PublicEstablishment;
  categories: PublicCategory[];
  products: PublicProduct[];
  isOpen: boolean;
  hoursLabel: string;
}) {
  const router = useRouter();
  const storageKey = `pedidofacil:cart:${establishment.slug}`;
  const customerKey = `pedidofacil:customer:${establishment.slug}`;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [state, formAction, submitting] = useActionState<CheckoutState, FormData>(
    createOrderAction,
    {},
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CartLine[];
        if (Array.isArray(parsed)) setCart(parsed.filter((line) => line && line.productId));
      }
    } catch {
      // carrinho corrompido: começa vazio
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // storage indisponível (modo privado)
    }
  }, [cart, ready, storageKey]);

  useEffect(() => {
    if (state.orderCode) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      router.push(`/m/${establishment.slug}/pedido/${state.orderCode}`);
    }
  }, [state.orderCode, router, establishment.slug, storageKey]);

  const subtotal = cartSubtotal(cart);
  const itemCount = cart.reduce((total, line) => total + clampQuantity(line.quantity), 0);
  const deliveryFee = establishment.delivery_fee_cents;
  const discount = coupon?.discountCents ?? 0;
  const totalWithDelivery = Math.max(0, subtotal + deliveryFee - discount);
  const totalPickup = Math.max(0, subtotal - discount);
  const meetsMinimum = subtotal >= establishment.min_order_cents;

  useEffect(() => {
    if (!coupon) return;
    if (subtotal <= 0) {
      setCoupon(null);
      return;
    }
    let active = true;
    validateCouponAction(establishment.slug, coupon.code, subtotal).then((result) => {
      if (!active) return;
      if (result.valid) {
        setCoupon({
          code: result.code ?? coupon.code,
          discountCents: result.discountCents ?? 0,
          message: result.message,
        });
        setCouponMessage(null);
      } else {
        setCoupon(null);
        setCouponMessage(result.message);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, establishment.slug]);

  function addToCart(product: PublicProduct, qty: number, notes: string) {
    setCart((current) => {
      const existing = current.find(
        (line) => line.productId === product.id && (line.notes ?? "") === notes,
      );
      if (existing) {
        return current.map((line) =>
          line === existing
            ? { ...line, quantity: clampQuantity(line.quantity + qty) }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          unitPriceCents: productPrice(product),
          quantity: clampQuantity(qty),
          notes: notes || undefined,
        },
      ];
    });
    setSelected(null);
    setQuantity(1);
    setItemNotes("");
  }

  function changeQuantity(productId: string, notes: string | undefined, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId && (line.notes ?? "") === (notes ?? "")
            ? { ...line, quantity: clampQuantity(line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(productId: string, notes: string | undefined) {
    setCart((current) =>
      current.filter(
        (line) => !(line.productId === productId && (line.notes ?? "") === (notes ?? "")),
      ),
    );
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponMessage("Informe o código do cupom.");
      return;
    }
    setCouponLoading(true);
    const result = await validateCouponAction(establishment.slug, code, subtotal);
    setCouponLoading(false);
    if (result.valid) {
      setCoupon({
        code: result.code ?? code.toUpperCase(),
        discountCents: result.discountCents ?? 0,
        message: result.message,
      });
      setCouponMessage(null);
    } else {
      setCoupon(null);
      setCouponMessage(result.message);
    }
  }

  const grouped = useMemo(() => {
    const byCategory = categories.map((category) => ({
      category,
      items: products.filter((product) => product.category_id === category.id),
    }));
    const uncategorized = products.filter(
      (product) => !product.category_id || !categories.some((c) => c.id === product.category_id),
    );
    return { byCategory: byCategory.filter((group) => group.items.length > 0), uncategorized };
  }, [categories, products]);

  const paymentOptions = establishment.payment_methods.length
    ? establishment.payment_methods
    : ["pix", "cash", "card"];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="relative">
        <div className="h-40 w-full overflow-hidden bg-slate-900 sm:h-52">
          {establishment.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={establishment.cover_url}
              alt={establishment.name}
              className="h-full w-full object-cover opacity-80"
            />
          ) : null}
        </div>
        <div className="mx-auto -mt-14 w-full max-w-4xl px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {establishment.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={establishment.logo_url}
                  alt={establishment.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Store className="h-7 w-7" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {establishment.name}
                  </h1>
                  <Badge tone={isOpen ? "green" : "red"}>{isOpen ? "Aberto agora" : "Fechado"}</Badge>
                </div>
                {establishment.description ? (
                  <p className="mt-1 text-sm text-slate-500">{establishment.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">{hoursLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              {establishment.address ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {establishment.address}
                  {establishment.city ? `, ${establishment.city}` : ""}
                </span>
              ) : null}
              {establishment.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {establishment.phone}
                </span>
              ) : null}
              {establishment.delivery_enabled ? (
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Entrega ~
                  {establishment.estimated_delivery_minutes} min ·{" "}
                  {establishment.delivery_fee_cents > 0
                    ? formatBRL(establishment.delivery_fee_cents)
                    : "grátis"}
                </span>
              ) : null}
              {establishment.pickup_enabled ? (
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Retirada ~
                  {establishment.estimated_pickup_minutes} min
                </span>
              ) : null}
            </div>

            {!isOpen ? (
              <Alert tone="amber" className="mt-4">
                O estabelecimento está fechado agora. Você pode montar seu carrinho e finalizar quando
                reabrir.
              </Alert>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {categories.length > 0 ? (
          <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                {category.name}
              </a>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">Cardápio em preparação</p>
            <p className="mt-1 text-sm text-slate-500">
              Este estabelecimento ainda não cadastrou produtos.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.byCategory.map((group) => (
              <section key={group.category.id} id={`cat-${group.category.id}`}>
                <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">
                  {group.category.name}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => {
                        setSelected(product);
                        setQuantity(1);
                        setItemNotes("");
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}

            {grouped.uncategorized.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Outros</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {grouped.uncategorized.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => {
                        setSelected(product);
                        setQuantity(1);
                        setItemNotes("");
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{selected.name}</h2>
                <p className="mt-1 text-sm font-semibold text-brand-600">
                  {formatBRL(productPrice(selected))}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Fechar"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selected.description ? (
              <p className="mt-2 text-sm text-slate-500">{selected.description}</p>
            ) : null}

            <div className="mt-4 space-y-4">
              <Field label="Quantidade">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((value) => clampQuantity(value - 1))}
                    aria-label="Diminuir"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((value) => clampQuantity(value + 1))}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Field>

              <Field label="Observações" hint="Ex.: sem cebola, ponto da carne, borda recheada">
                <Textarea
                  value={itemNotes}
                  onChange={(event) => setItemNotes(event.target.value)}
                  placeholder="Alguma preferência?"
                />
              </Field>

              <Button
                type="button"
                className="w-full"
                onClick={() => addToCart(selected, quantity, itemNotes.trim())}
              >
                Adicionar · {formatBRL(productPrice(selected) * quantity)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </p>
              <p className="text-base font-bold text-slate-900">{formatBRL(subtotal)}</p>
            </div>
            <Button type="button" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="h-4 w-4" /> Ver carrinho
            </Button>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {checkoutOpen ? "Finalizar pedido" : "Seu carrinho"}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Fechar"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!checkoutOpen ? (
                <>
                  {cart.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">Seu carrinho está vazio.</p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((line) => (
                        <div
                          key={`${line.productId}-${line.notes ?? ""}`}
                          className="rounded-xl border border-slate-200 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{line.name}</p>
                              {line.notes ? (
                                <p className="mt-0.5 text-xs text-slate-500">{line.notes}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-slate-400">
                                {formatBRL(line.unitPriceCents)} cada
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(line.productId, line.notes)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label="Diminuir"
                                onClick={() => changeQuantity(line.productId, line.notes, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {line.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label="Aumentar"
                                onClick={() => changeQuantity(line.productId, line.notes, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {formatBRL(line.unitPriceCents * line.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex gap-2">
                          <Input
                            value={couponInput}
                            onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                            placeholder="Cupom de desconto"
                            aria-label="Cupom de desconto"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={applyCoupon}
                            disabled={couponLoading}
                          >
                            {couponLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Tag className="h-3.5 w-3.5" />
                            )}
                            Aplicar
                          </Button>
                        </div>
                        {coupon ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-600">
                            {coupon.code} · −{formatBRL(coupon.discountCents)}
                          </p>
                        ) : null}
                        {couponMessage ? (
                          <p className="mt-2 text-xs font-medium text-rose-600">{couponMessage}</p>
                        ) : null}
                      </div>

                      <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>{formatBRL(subtotal)}</span>
                        </div>
                        {discount > 0 ? (
                          <div className="flex justify-between text-emerald-600">
                            <span>Desconto</span>
                            <span>−{formatBRL(discount)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-slate-600">
                          <span>Entrega</span>
                          <span>
                            {establishment.delivery_enabled
                              ? deliveryFee > 0
                                ? formatBRL(deliveryFee)
                                : "Grátis"
                              : "Somente retirada"}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-bold text-slate-900">
                          <span>Total estimado</span>
                          <span>
                            {formatBRL(
                              establishment.delivery_enabled ? totalWithDelivery : totalPickup,
                            )}
                          </span>
                        </div>
                      </div>

                      {!meetsMinimum ? (
                        <Alert tone="amber">
                          Pedido mínimo de {formatBRL(establishment.min_order_cents)}. Faltam{" "}
                          {formatBRL(establishment.min_order_cents - subtotal)}.
                        </Alert>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <form id="checkout-form" action={formAction} className="space-y-4">
                  <input type="hidden" name="slug" value={establishment.slug} />
                  <input type="hidden" name="items" value={JSON.stringify(cart)} />
                  <input type="hidden" name="coupon_code" value={coupon?.code ?? ""} />

                  <Field label="Seu nome">
                    <Input name="customer_name" required placeholder="Como devemos chamar você?" />
                  </Field>

                  <Field label="Telefone / WhatsApp" hint="Usamos para contato sobre o pedido">
                    <Input name="customer_phone" required placeholder="(11) 99999-9999" inputMode="tel" />
                  </Field>

                  <Field label="Como você quer receber?">
                    <Select name="fulfillment" defaultValue={establishment.delivery_enabled ? "delivery" : "pickup"}>
                      {establishment.delivery_enabled ? (
                        <option value="delivery">
                          Entrega · ~{establishment.estimated_delivery_minutes} min
                        </option>
                      ) : null}
                      {establishment.pickup_enabled ? (
                        <option value="pickup">
                          Retirada · ~{establishment.estimated_pickup_minutes} min
                        </option>
                      ) : null}
                    </Select>
                  </Field>

                  {establishment.delivery_enabled ? (
                    <Field label="Endereço de entrega" hint="Rua, número, bairro e complemento">
                      <Textarea name="address" placeholder="Rua das Flores, 123 — Centro" />
                    </Field>
                  ) : null}

                  <Field label="Forma de pagamento">
                    <Select name="payment_method" defaultValue={paymentOptions[0]}>
                      {paymentOptions.map((method) => (
                        <option key={method} value={method}>
                          {PAYMENT_LABELS[method] ?? method}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Troco para (opcional)" hint="Somente para pagamento em dinheiro">
                    <Input name="change_for" placeholder="50,00" inputMode="decimal" />
                  </Field>

                  <Field label="Observações do pedido">
                    <Textarea name="notes" placeholder="Ex.: tocar a campainha, entregar na portaria" />
                  </Field>

                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatBRL(subtotal)}</span>
                    </div>
                    {discount > 0 ? (
                      <div className="flex justify-between text-emerald-600">
                        <span>Desconto ({coupon?.code})</span>
                        <span>−{formatBRL(discount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-slate-600">
                      <span>Taxa de entrega</span>
                      <span>{deliveryFee > 0 ? formatBRL(deliveryFee) : "Grátis"}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                      <span>Total</span>
                      <span>{formatBRL(totalWithDelivery)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      O valor final é confirmado pelo estabelecimento ao aceitar o pedido.
                    </p>
                  </div>

                  {state.error ? <Alert tone="red">{state.error}</Alert> : null}
                  {!isOpen ? (
                    <Alert tone="amber">
                      O estabelecimento está fechado. Você pode enviar o pedido, mas ele será
                      confirmado no horário de funcionamento.
                    </Alert>
                  ) : null}
                </form>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              {checkoutOpen ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCheckoutOpen(false)}
                    disabled={submitting}
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button type="submit" form="checkout-form" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Enviar pedido ·{" "}
                    {formatBRL(establishment.delivery_enabled ? totalWithDelivery : totalPickup)}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  disabled={cart.length === 0 || !meetsMinimum}
                  onClick={() => setCheckoutOpen(true)}
                >
                  Continuar
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: PublicProduct;
  onSelect: () => void;
}) {
  const price = productPrice(product);
  const hasPromo = product.promo_price_cents !== null && product.promo_price_cents < product.price_cents;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-sm"
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
          <ShoppingBag className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
        {product.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{product.description}</p>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{formatBRL(price)}</span>
          {hasPromo ? (
            <span className="text-xs text-slate-400 line-through">
              {formatBRL(product.price_cents)}
            </span>
          ) : null}
        </div>
      </div>
      <span className="self-center rounded-full bg-brand-600 p-1.5 text-white">
        <Plus className="h-4 w-4" />
      </span>
    </button>
  );
}
