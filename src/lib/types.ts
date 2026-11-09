export type UserRole = "superadmin" | "owner" | "staff";
export type EstablishmentStatus = "active" | "blocked" | "pending";
export type Fulfillment = "delivery" | "pickup";
export type PaymentMethod = "pix" | "cash" | "card" | "online";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "canceled";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface PlanFeatures {
  coupons?: boolean;
  reports?: boolean;
  branding?: boolean;
  featured?: boolean;
  support?: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  max_products: number | null;
  max_categories: number | null;
  max_units: number;
  features: PlanFeatures;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Establishment {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  primary_color: string;
  status: EstablishmentStatus;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee_cents: number;
  min_order_cents: number;
  estimated_delivery_minutes: number;
  estimated_pickup_minutes: number;
  payment_methods: PaymentMethod[];
  is_open_override: boolean | null;
  plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  establishment_id: string;
  user_id: string;
  role: "owner" | "staff";
  created_at: string;
}

export interface Subscription {
  id: string;
  establishment_id: string;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  establishment_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  establishment_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  establishment_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  orders_count: number;
  total_spent_cents: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  establishment_id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BusinessHour {
  id: string;
  establishment_id: string;
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface Order {
  id: string;
  establishment_id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  address: string | null;
  notes: string | null;
  payment_method: PaymentMethod;
  change_for_cents: number | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  coupon_code: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  notes: string | null;
  total_cents: number;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface MenuEstablishment {
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
  primary_color: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee_cents: number;
  min_order_cents: number;
  estimated_delivery_minutes: number;
  estimated_pickup_minutes: number;
  payment_methods: PaymentMethod[];
  is_open_override: boolean | null;
  plan_id: string | null;
}

export interface TrackedOrder {
  code: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  customer_name: string;
  address: string | null;
  establishment: {
    name: string;
    slug: string;
    whatsapp: string | null;
    phone: string | null;
    primary_color: string;
  };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    notes: string | null;
  }>;
}
