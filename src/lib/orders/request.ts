// Demande de commande : validation du formulaire, prix recalculés à partir
// du catalogue et raisons d'attention pour l'apiculteur. Sans dépendance à
// Next ni à Supabase (testable).

import type { PublicProduct } from "../../data/catalog.ts";
import { isValidEmail, normalizeEmail } from "../auth/validation.ts";
import { calculatePricedLine } from "../domain/pricing.ts";

export type DeliveryChoice = "pickup" | "delivery";

export type OrderContact = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  professionalId: string;
  deliveryMethod: DeliveryChoice;
  addressLine1: string;
  postalCode: string;
  city: string;
  requestedDate: string;
  message: string;
};

type FormLike = { get(name: string): FormDataEntryValue | null };

const DAY = 86_400_000;

/** Coordonnées et préférences du formulaire ; `today` au format AAAA-MM-JJ. */
export function parseOrderContact(
  form: FormLike,
  today: string,
): { ok: true; value: OrderContact } | { ok: false; errors: Record<string, string> } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const errors: Record<string, string> = {};

  const name = text("name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) errors.name = "Indiquez votre nom (2 à 120 caractères).";

  const email = normalizeEmail(text("email"));
  if (!isValidEmail(email)) errors.email = "Adresse email invalide.";

  const phone = text("phone");
  if (!/^\+?[0-9 .()-]{6,30}$/.test(phone) || (phone.match(/[0-9]/g)?.length ?? 0) < 6) {
    errors.phone = "Indiquez un numéro de téléphone pour convenir du retrait ou de la livraison.";
  }

  const companyName = text("companyName");
  if (companyName.length > 120) errors.companyName = "120 caractères au maximum.";
  const professionalId = text("professionalId");
  if (professionalId && !/^[A-Za-z0-9 .\-/]{2,40}$/.test(professionalId)) {
    errors.professionalId = "Lettres, chiffres et tirets uniquement (40 au maximum).";
  }

  const method = text("deliveryMethod");
  const deliveryMethod: DeliveryChoice = method === "delivery" ? "delivery" : "pickup";
  if (method !== "pickup" && method !== "delivery") errors.deliveryMethod = "Choisissez le retrait ou la livraison.";

  const addressLine1 = deliveryMethod === "delivery" ? text("addressLine1") : "";
  const postalCode = deliveryMethod === "delivery" ? text("postalCode").replace(/\s/g, "") : "";
  const city = deliveryMethod === "delivery" ? text("city") : "";
  if (deliveryMethod === "delivery") {
    if (addressLine1.length < 3 || addressLine1.length > 200) errors.addressLine1 = "Indiquez l’adresse de livraison.";
    if (!/^\d{5}$/.test(postalCode)) errors.postalCode = "Code postal à 5 chiffres.";
    if (city.length < 2 || city.length > 100) errors.city = "Indiquez la ville.";
  }

  const requestedDate = text("requestedDate");
  if (requestedDate) {
    const date = Date.parse(`${requestedDate}T12:00:00Z`);
    const start = Date.parse(`${today}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(date)) {
      errors.requestedDate = "Date invalide.";
    } else if (date < start) {
      errors.requestedDate = "Choisissez une date à venir.";
    } else if (date > start + 548 * DAY) {
      errors.requestedDate = "Choisissez une date dans les 18 prochains mois.";
    }
  }

  const message = text("message");
  if (message.length > 2000) errors.message = "2 000 caractères au maximum.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, email, phone, companyName, professionalId, deliveryMethod, addressLine1, postalCode, city, requestedDate, message },
  };
}

export type RequestLine = {
  product: PublicProduct;
  quantity: number;
  /** null : prix non affiché, à confirmer par l'apiculteur. */
  unitPriceCents: number | null;
  lineTotalCents: number | null;
};

export type PricedRequest = {
  lines: RequestLine[];
  /** Ce qui empêche l'envoi (produit retiré, épuisé, quantité supérieure au stock affiché). */
  problems: string[];
  subtotalCents: number;
  totalQuantity: number;
};

export function isOrderable(product: PublicProduct) {
  return !(
    product.stockStatusLabel === "sold_out" ||
    product.stockStatusLabel === "coming_soon" ||
    product.displayedStockQuantity === 0
  );
}

/** Prix recalculés depuis le catalogue : ceux du navigateur ne sont jamais repris. */
export function priceRequest(
  items: { id: string; quantity: number }[],
  products: PublicProduct[],
): PricedRequest {
  const byId = new Map(products.map((product) => [product.id, product]));
  const problems: string[] = [];
  const lines: RequestLine[] = [];
  for (const item of items) {
    const product = byId.get(item.id);
    if (!product) {
      problems.push("Un produit de votre panier n’est plus proposé : retirez-le avant d’envoyer la demande.");
      continue;
    }
    if (!isOrderable(product)) {
      problems.push(`« ${product.name} » n’est plus disponible pour le moment.`);
      continue;
    }
    if (product.stockDisplayMode === "exact" && product.displayedStockQuantity !== null && item.quantity > product.displayedStockQuantity) {
      problems.push(`Il ne reste que ${product.displayedStockQuantity} « ${product.name} ».`);
      continue;
    }
    if (product.priceVisibility === "visible") {
      const line = calculatePricedLine(product.basePrice, product.pricingTiers, item.quantity);
      lines.push({ product, quantity: item.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.lineTotalCents });
    } else {
      lines.push({ product, quantity: item.quantity, unitPriceCents: null, lineTotalCents: null });
    }
  }
  return {
    lines,
    problems,
    subtotalCents: lines.reduce((sum, line) => sum + (line.lineTotalCents ?? 0), 0),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * Raisons d'attention affichées à l'apiculteur (H2 : elles ne bloquent rien,
 * toute demande est de toute façon étudiée).
 */
export function reviewReasons(
  request: Pick<PricedRequest, "lines" | "totalQuantity">,
  deliveryMethod: DeliveryChoice,
  quantityThreshold: number,
): string[] {
  const reasons: string[] = [];
  if (request.totalQuantity >= quantityThreshold) reasons.push(`Grande quantité (${request.totalQuantity} unités)`);
  if (deliveryMethod === "delivery") reasons.push("Livraison à organiser");
  if (request.lines.some(({ product }) => product.purchaseMode === "reservation" || product.stockStatusLabel === "reservation_open")) {
    reasons.push("Réservation");
  }
  if (request.lines.some(({ product }) => product.purchaseMode === "quote")) reasons.push("Sur devis");
  if (request.lines.some((line) => line.unitPriceCents === null)) reasons.push("Prix à confirmer");
  return reasons;
}
