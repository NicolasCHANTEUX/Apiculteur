// Règles de livraison (CAHIER §8.2 et §9) : distance à vol d'oiseau (H5),
// zones par pays et préfixes postaux, frais, raisons d'attention. Rien ne
// bloque une demande (H2) : sans zone, la livraison reste « sur devis ».
// Sans dépendance à Next (testable).

export type GeoPoint = { lat: number; lng: number };

export type DeliveryZone = {
  id: string;
  name: string;
  active: boolean;
  countries: string[];
  includePrefixes: string[];
  excludePrefixes: string[];
  feeCents: number;
  extraUnitFeeCents: number;
  maxDistanceKm: number | null;
};

export type ProductDeliveryMode = "pickup_only" | "deliverable" | "quote";

/** Distance à vol d'oiseau (formule de haversine), en km, au dixième. */
export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const radius = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * radius * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** « 14, 27 50 » → ["14", "27", "50"] ; les valeurs non numériques sont signalées. */
export function parsePrefixes(text: string) {
  const parts = text.split(/[\s,;]+/).map((part) => part.trim()).filter(Boolean);
  const prefixes = [...new Set(parts.filter((part) => /^\d{1,5}$/.test(part)))];
  return { prefixes, invalid: parts.filter((part) => !/^\d{1,5}$/.test(part)) };
}

export function zoneMatches(zone: DeliveryZone, target: { country: string; postalCode: string; distanceKm: number | null }) {
  if (!zone.active || zone.feeCents <= 0) return false;
  if (!zone.countries.includes(target.country)) return false;
  const postal = target.postalCode.replace(/\s/g, "");
  if (zone.includePrefixes.length && !zone.includePrefixes.some((prefix) => postal.startsWith(prefix))) return false;
  if (zone.excludePrefixes.some((prefix) => postal.startsWith(prefix))) return false;
  // Distance maximale : sans distance connue, la zone n'est pas retenue.
  if (zone.maxDistanceKm !== null && (target.distanceKm === null || target.distanceKm > zone.maxDistanceKm)) return false;
  return true;
}

/** Frais d'une zone : forfait, plus un supplément par unité au-delà de la première. */
export function zoneFeeCents(zone: DeliveryZone, quantity: number) {
  return zone.feeCents + zone.extraUnitFeeCents * Math.max(0, quantity - 1);
}

export type DeliveryQuote =
  | { kind: "zone"; zone: DeliveryZone; feeCents: number }
  | { kind: "quote"; reason: string }
  | { kind: "unavailable"; products: string[] };

/**
 * Livraison proposée avec un tarif seulement si tous les articles sont
 * livrables et qu'une zone active correspond (CAHIER §9) ; sinon sur devis,
 * ou impossible si un produit est à retirer sur place.
 */
export function quoteDelivery(input: {
  zones: DeliveryZone[];
  lines: { name: string; quantity: number; deliveryMode: ProductDeliveryMode }[];
  country: string;
  postalCode: string;
  distanceKm: number | null;
}): DeliveryQuote {
  const pickupOnly = input.lines.filter((line) => line.deliveryMode === "pickup_only").map((line) => line.name);
  if (pickupOnly.length) return { kind: "unavailable", products: pickupOnly };
  const onQuote = input.lines.find((line) => line.deliveryMode === "quote");
  if (onQuote) return { kind: "quote", reason: `Transport sur devis pour « ${onQuote.name} »` };
  const zone = input.zones.find((candidate) => zoneMatches(candidate, input));
  if (!zone) return { kind: "quote", reason: "Pas de tarif pour cette adresse" };
  const quantity = input.lines.reduce((sum, line) => sum + line.quantity, 0);
  return { kind: "zone", zone, feeCents: zoneFeeCents(zone, quantity) };
}

export type DistanceThresholds = { autoKm: number; manualKm: number };

/** Raisons d'attention liées à la distance, pour l'admin (jamais bloquantes). */
export function distanceReasons(distance: number | null, thresholds: DistanceThresholds, geocoded: boolean) {
  if (!geocoded) return ["Adresse non localisée"];
  if (distance === null) return [];
  if (distance > thresholds.manualKm) return [`Très longue distance (${Math.round(distance)} km)`];
  if (distance > thresholds.autoKm) return [`Livraison éloignée (${Math.round(distance)} km)`];
  return [];
}
