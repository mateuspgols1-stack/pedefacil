import type { OrderStatus } from "@/lib/types";

export function formatBRL(cents: number | null | undefined) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function formatPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value ?? "—";
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão na entrega",
  online: "Pagamento online",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: string; dot: string }
> = {
  pending: {
    label: "Aguardando confirmação",
    description: "Pedido recebido, aguardando aceite do estabelecimento.",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    description: "O estabelecimento aceitou o pedido.",
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  preparing: {
    label: "Em preparo",
    description: "Seu pedido está sendo preparado.",
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  ready: {
    label: "Pronto",
    description: "Pedido pronto para retirada.",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  out_for_delivery: {
    label: "Saiu para entrega",
    description: "O pedido está a caminho.",
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
  },
  completed: {
    label: "Concluído",
    description: "Pedido finalizado. Bom apetite!",
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
  canceled: {
    label: "Cancelado",
    description: "Pedido cancelado.",
    tone: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

export function statusMeta(status: OrderStatus) {
  return ORDER_STATUS_META[status] ?? ORDER_STATUS_META.pending;
}
