import { notFound, redirect } from "next/navigation";

import { MenuClient, type PublicCategory, type PublicProduct } from "@/components/menu-client";
import { isSupabaseConfigured } from "@/lib/env";
import { isOpenNow, todayHoursLabel, type BusinessHour } from "@/lib/hours";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface MenuEstablishment {
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
  payment_methods: string[] | null;
  is_open_override: boolean | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Cardápio · ${slug}` };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured) redirect("/setup");
  const { slug } = await params;

  const supabase = await createClient();

  const { data: establishmentRow } = await supabase
    .from("menu_establishments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const establishment = establishmentRow as MenuEstablishment | null;
  if (!establishment) notFound();

  const [{ data: categoryRows }, { data: productRows }, { data: hourRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description")
      .eq("establishment_id", establishment.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, description, price_cents, promo_price_cents, image_url, category_id")
      .eq("establishment_id", establishment.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("business_hours")
      .select("weekday, is_closed, open_time, close_time")
      .eq("establishment_id", establishment.id),
  ]);

  const hours = (hourRows ?? []) as BusinessHour[];

  return (
    <MenuClient
      establishment={{
        id: establishment.id,
        name: establishment.name,
        slug: establishment.slug,
        description: establishment.description,
        logo_url: establishment.logo_url,
        cover_url: establishment.cover_url,
        phone: establishment.phone,
        whatsapp: establishment.whatsapp,
        address: establishment.address,
        city: establishment.city,
        delivery_enabled: establishment.delivery_enabled,
        pickup_enabled: establishment.pickup_enabled,
        delivery_fee_cents: establishment.delivery_fee_cents,
        min_order_cents: establishment.min_order_cents,
        estimated_delivery_minutes: establishment.estimated_delivery_minutes,
        estimated_pickup_minutes: establishment.estimated_pickup_minutes,
        payment_methods: establishment.payment_methods ?? [],
      }}
      categories={(categoryRows ?? []) as PublicCategory[]}
      products={(productRows ?? []) as PublicProduct[]}
      isOpen={isOpenNow(hours, establishment.is_open_override)}
      hoursLabel={todayHoursLabel(hours)}
    />
  );
}
