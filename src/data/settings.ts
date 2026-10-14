import "server-only";

import { cache } from "react";
import { readDeliverySettings, type DeliverySettings } from "@/lib/delivery/settings";
import { parseReviewDelay } from "@/lib/reviews/form";
import { mainNav, type NavLink } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabaseConfig, isDemoMode } from "@/lib/supabase/env";

export type OrderSettings = {
  /** Réception des demandes de commande depuis le site. */
  ordersOpen: boolean;
  /** À partir de cette quantité, la demande est signalée « grande quantité ». */
  quantityThreshold: number;
};

export type SiteSettings = {
  /** Avis clients visibles sur le site (page, menu, accueil, notes des produits). */
  reviewsPublic: boolean;
};

const closed: OrderSettings = { ordersOpen: false, quantityThreshold: 30 };

const SETTING_KEYS = [
  "orders_open",
  "manual_validation_quantity_threshold",
  "reviews_public",
  "review_request_delay_days",
  "delivery_origin_address",
  "delivery_settings",
  "max_auto_delivery_distance_km",
  "manual_validation_distance_threshold_km",
];

// Réglages lus avec la clé serveur (app_settings n'est lisible que par les
// admins), une seule fois par requête. Prudence par défaut : en cas
// d'erreur, `null` et chaque réglage garde sa valeur sûre.
const readSettings = cache(async (): Promise<Map<string, unknown> | null> => {
  if (!getPublicSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data, error } = await createAdminClient().from("app_settings").select("key, value").in("key", SETTING_KEYS);
  if (error) {
    console.error("Réglages du site", error.code, error.message);
    return null;
  }
  return new Map((data ?? []).map((row) => [row.key as string, row.value as unknown]));
});

// En cas d'erreur, les demandes sont fermées et le site propose le contact
// par email.
export const getOrderSettings = cache(async (): Promise<OrderSettings> => {
  const settings = await readSettings();
  if (!settings) return closed;
  const threshold = Number(settings.get("manual_validation_quantity_threshold"));
  return {
    ordersOpen: settings.get("orders_open") === true,
    quantityThreshold: Number.isInteger(threshold) && threshold > 0 ? threshold : closed.quantityThreshold,
  };
});

// Avis masqués par défaut : seuls de vrais avis de clients doivent être
// montrés, et l'apiculteur décide quand les afficher. Visibles en mode
// démonstration (données fictives, développement local sans Supabase).
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (isDemoMode()) return { reviewsPublic: true };
  const settings = await readSettings();
  return { reviewsPublic: settings?.get("reviews_public") === true };
});

/**
 * Délai (jours) entre le retrait ou la livraison et la demande d'avis ;
 * 0 : pas de demande automatique. 7 jours si le réglage est illisible.
 */
export const getReviewSettings = cache(async (): Promise<{ delayDays: number }> => {
  const settings = await readSettings();
  return { delayDays: parseReviewDelay(settings?.get("review_request_delay_days") ?? 7) };
});

/** Retrait, adresse de départ et seuils de distance (CAHIER §8.2, §9). */
export const getDeliverySettings = cache(async (): Promise<DeliverySettings> => {
  const settings = await readSettings();
  return readDeliverySettings({
    origin: settings?.get("delivery_origin_address"),
    settings: settings?.get("delivery_settings"),
    autoKm: settings?.get("max_auto_delivery_distance_km"),
    manualKm: settings?.get("manual_validation_distance_threshold_km"),
  });
});

/** Menu public, sans « Avis clients » quand les avis sont masqués. */
export async function getSiteNav(): Promise<NavLink[]> {
  const { reviewsPublic } = await getSiteSettings();
  return mainNav.filter((link) => reviewsPublic || link.href !== "/avis");
}
