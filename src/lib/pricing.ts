import type { Fulfillment } from "@/lib/types";

export interface CartLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
}

export interface CouponRule {
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_cents: number;
}

export const MAX_QUANTITY = 99;

export function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function lineTotal(line: CartLine) {
  return line.unitPriceCents * clampQuantity(line.quantity);
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((total, line) => total + clampQuantity(line.quantity), 0);
}

export function couponDiscount(subtotalCents: number, coupon: CouponRule | null | undefined) {
  if (!coupon || subtotalCents <= 0) return 0;
  if (subtotalCents < coupon.min_order_cents) return 0;

  const raw =
    coupon.discount_type === "percent"
      ? Math.floor((subtotalCents * coupon.discount_value) / 100)
      : coupon.discount_value;

  return Math.max(0, Math.min(raw, subtotalCents));
}

export function orderTotals(input: {
  lines: CartLine[];
  fulfillment: Fulfillment;
  deliveryFeeCents: number;
  coupon?: CouponRule | null;
}) {
  const subtotal = cartSubtotal(input.lines);
  const deliveryFee = input.fulfillment === "delivery" ? Math.max(0, input.deliveryFeeCents) : 0;
  const discount = couponDiscount(subtotal, input.coupon);
  const total = Math.max(0, subtotal + deliveryFee - discount);

  return { subtotal, deliveryFee, discount, total };
}

export function meetsMinimumOrder(subtotalCents: number, minOrderCents: number) {
  return subtotalCents >= Math.max(0, minOrderCents);
}

/** Payload enviado ao RPC create_order — preços são recalculados no banco. */
export function buildOrderPayload(input: {
  lines: CartLine[];
  fulfillment: Fulfillment;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  notes?: string | null;
  paymentMethod: string;
  changeForCents?: number | null;
  couponCode?: string | null;
}) {
  return {
    fulfillment: input.fulfillment,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.replace(/\D/g, ""),
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
    payment_method: input.paymentMethod,
    change_for_cents: input.changeForCents ?? null,
    coupon_code: input.couponCode?.trim().toUpperCase() || null,
    items: input.lines.map((line) => ({
      product_id: line.productId,
      quantity: clampQuantity(line.quantity),
      notes: line.notes?.trim() || null,
    })),
  };
}
