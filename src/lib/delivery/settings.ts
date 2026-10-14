// Réglages du retrait et de la livraison, lus depuis app_settings (valeurs
// jsonb) avec des valeurs sûres par défaut. Sans dépendance à Next
// (testable).

export const pickupModes = {
  after_acceptance: "Communiquée dans l’email d’acceptation",
  public: "Affichée sur le site",
  on_request: "Communiquée au cas par cas",
} as const;

export type PickupMode = keyof typeof pickupModes;

export type DeliveryOrigin = {
  line1: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  /** Adresse reconnue par le géocodage. */
  label: string;
};

export type DeliverySettings = {
  origin: DeliveryOrigin | null;
  pickupMode: PickupMode;
  pickupInstructions: string;
  transportNote: string;
  autoKm: number;
  manualKm: number;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positive(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

export function readDeliverySettings(values: { origin: unknown; settings: unknown; autoKm: unknown; manualKm: unknown }): DeliverySettings {
  const origin = values.origin && typeof values.origin === "object" ? (values.origin as Record<string, unknown>) : {};
  const settings = values.settings && typeof values.settings === "object" ? (values.settings as Record<string, unknown>) : {};
  const line1 = text(origin.line1, 200);
  const postalCode = text(origin.postal_code, 5);
  const city = text(origin.city, 100);
  const latitude = typeof origin.latitude === "number" ? origin.latitude : null;
  const longitude = typeof origin.longitude === "number" ? origin.longitude : null;
  const mode = settings.pickupMode;
  return {
    origin: city ? { line1, postalCode, city, latitude, longitude, label: text(origin.label, 200) } : null,
    pickupMode: mode === "public" || mode === "on_request" ? mode : "after_acceptance",
    pickupInstructions: text(settings.pickupInstructions, 600),
    transportNote: text(settings.transportNote, 2000),
    autoKm: positive(values.autoKm, 150),
    manualKm: positive(values.manualKm, 300),
  };
}

/** Adresse de retrait à communiquer, ou null si elle reste au cas par cas. */
export function pickupAddress(settings: DeliverySettings, context: "site" | "accepted") {
  const origin = settings.origin;
  if (!origin?.line1) return null;
  if (settings.pickupMode === "on_request") return null;
  if (context === "site" && settings.pickupMode !== "public") return null;
  return `${origin.line1}, ${origin.postalCode} ${origin.city}`;
}
