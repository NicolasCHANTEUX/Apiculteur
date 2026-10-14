import "server-only";

import { cache } from "react";
import { getDeliverySettings } from "@/data/settings";
import { eurosToCents } from "@/lib/domain/pricing";
import { geocodeFrenchAddress, type Geocoded } from "@/lib/delivery/geocode";
import { distanceKm, distanceReasons, quoteDelivery, type DeliveryQuote, type DeliveryZone, type ProductDeliveryMode } from "@/lib/delivery/rules";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// Zones de livraison et évaluation d'une adresse (ROADMAP lot 10).

type ZoneRow = {
  id: string;
  name: string;
  active: boolean;
  countries: string[] | null;
  include_prefixes: string[] | null;
  exclude_prefixes: string[] | null;
  fee: number | string;
  extra_unit_fee: number | string;
  max_distance_km: number | null;
};

export function toZone(row: ZoneRow): DeliveryZone {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    countries: row.countries ?? ["FR"],
    includePrefixes: row.include_prefixes ?? [],
    excludePrefixes: row.exclude_prefixes ?? [],
    feeCents: eurosToCents(row.fee),
    extraUnitFeeCents: eurosToCents(row.extra_unit_fee),
    maxDistanceKm: row.max_distance_km,
  };
}

export const ZONE_COLUMNS = "id, name, active, countries, include_prefixes, exclude_prefixes, fee, extra_unit_fee, max_distance_km";

/** Zones actives (tarifs publics), dans l'ordre de priorité. Vide en cas d'erreur. */
export const getActiveZones = cache(async (): Promise<DeliveryZone[]> => {
  if (!getPublicSupabaseConfig()) return [];
  const { data, error } = await createPublicClient().from("delivery_zones").select(ZONE_COLUMNS).eq("active", true).order("display_order").order("name");
  if (error) {
    if (error.code !== "PGRST205" && error.code !== "42P01") console.error("Zones de livraison", error.code, error.message);
    return [];
  }
  return ((data ?? []) as ZoneRow[]).map(toZone);
});

export type DeliveryAssessment = {
  geocoded: Geocoded | null;
  distanceKm: number | null;
  quote: DeliveryQuote;
  /** Raisons d'attention pour l'admin (distance, devis). */
  reasons: string[];
};

/**
 * Évalue une adresse de livraison : géocodage (5 s au plus), distance
 * depuis l'exploitation, zone et frais. Ne bloque jamais la demande.
 */
export async function assessDelivery(input: {
  address: { line1: string; postalCode: string; city: string };
  lines: { name: string; quantity: number; deliveryMode: ProductDeliveryMode }[];
}): Promise<DeliveryAssessment> {
  const [settings, zones] = await Promise.all([getDeliverySettings(), getActiveZones()]);
  const geocoded = await Promise.race([
    geocodeFrenchAddress(input.address).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
  const origin = settings.origin?.latitude != null && settings.origin.longitude != null ? { lat: settings.origin.latitude, lng: settings.origin.longitude } : null;
  const distance = geocoded && origin ? distanceKm(origin, geocoded) : null;
  const quote = quoteDelivery({ zones, lines: input.lines, country: "FR", postalCode: input.address.postalCode, distanceKm: distance });
  const reasons = [
    ...(origin ? distanceReasons(distance, { autoKm: settings.autoKm, manualKm: settings.manualKm }, Boolean(geocoded)) : geocoded ? [] : ["Adresse non localisée"]),
    ...(quote.kind === "quote" ? [`Livraison sur devis : ${quote.reason.charAt(0).toLowerCase()}${quote.reason.slice(1)}`] : []),
  ];
  return { geocoded, distanceKm: distance, quote, reasons };
}
