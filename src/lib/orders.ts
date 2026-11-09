import type { Fulfillment, OrderStatus } from "@/lib/types";

export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
];

/** Próximo passo natural do pedido, considerando entrega ou retirada. */
export function nextStatus(status: OrderStatus, fulfillment: Fulfillment): OrderStatus | null {
  if (status === "pending") return "confirmed";
  if (status === "confirmed") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return fulfillment === "delivery" ? "out_for_delivery" : "completed";
  if (status === "out_for_delivery") return "completed";
  return null;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: Fulfillment,
): boolean {
  if (from === to) return false;
  if (from === "completed" || from === "canceled") return false;
  if (to === "canceled") return true;
  if (to === "out_for_delivery" && fulfillment !== "delivery") return false;
  return nextStatus(from, fulfillment) === to;
}

export function isActiveOrder(status: OrderStatus) {
  return status !== "completed" && status !== "canceled";
}

export const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export function statusProgress(status: OrderStatus, fulfillment: Fulfillment) {
  if (status === "canceled") return 0;
  const steps: OrderStatus[] =
    fulfillment === "delivery"
      ? ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed"]
      : ["pending", "confirmed", "preparing", "ready", "completed"];
  const index = steps.indexOf(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / steps.length) * 100);
}
