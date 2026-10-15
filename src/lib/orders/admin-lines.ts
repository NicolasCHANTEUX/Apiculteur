// Commandes saisies ou modifiées par l'apiculteur (fin du lot 5) : lignes de
// produits, proposition de modification au client, vente manuelle. Fonctions
// pures, sans dépendance à Next ni à Supabase (testables), utilisées aussi
// par les formulaires dans le navigateur.

import { isValidEmail, normalizeEmail } from "../auth/validation.ts";
import { parseEurosToCents } from "../catalog/product-form.ts";

export const MAX_LINES = 30;
export const MAX_QUANTITY = 999;
/** 99 999,99 € : borne aussi vérifiée par la base. */
export const MAX_UNIT_PRICE_CENTS = 9_999_999;
/** Validité du lien de réponse à une proposition. */
export const PROPOSAL_LINK_DAYS = 14;

/** Produit proposé dans les formulaires de l'admin. */
export type SaleProduct = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  purchaseMode: "standard" | "reservation" | "quote";
  saleUnit: string | null;
  basePriceCents: number;
  tiers: { min: number; max: number | null; priceCents: number }[];
  /** Stock de la vente directe ; null pour une réservation ou un devis. */
  stock: number | null;
};

/** Ligne telle que saisie dans le formulaire (prix en texte, « 155,50 »). */
export type DraftLine = { productId: string; quantity: number; unitPrice: string };

export type SaleLine = { productId: string; name: string; quantity: number; unitPriceCents: number; lineTotalCents: number };

/** Prix unitaire du palier correspondant à la quantité, sinon prix de base. */
export function tierUnitPriceCents(product: Pick<SaleProduct, "basePriceCents" | "tiers">, quantity: number): number {
  const tier = product.tiers.find((candidate) => quantity >= candidate.min && (candidate.max === null || quantity <= candidate.max));
  return tier ? tier.priceCents : product.basePriceCents;
}

/** « 155,50 » à partir de centimes, pour pré-remplir un champ de prix. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

export function parseLines(
  raw: unknown,
  products: Map<string, Pick<SaleProduct, "id" | "name">>,
): { ok: true; lines: SaleLine[]; subtotalCents: number } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!Array.isArray(data)) return { ok: false, error: "Ajoutez au moins un produit." };
  if (data.length === 0) return { ok: false, error: "Ajoutez au moins un produit." };
  if (data.length > MAX_LINES) return { ok: false, error: `${MAX_LINES} produits au maximum.` };

  const seen = new Set<string>();
  const lines: SaleLine[] = [];
  for (const item of data) {
    const value = (item ?? {}) as Partial<Record<keyof DraftLine, unknown>>;
    const product = typeof value.productId === "string" ? products.get(value.productId) : undefined;
    if (!product) return { ok: false, error: "Un des produits n’existe plus : retirez-le de la liste." };
    if (seen.has(product.id)) return { ok: false, error: `« ${product.name} » apparaît deux fois : regroupez les quantités.` };
    seen.add(product.id);
    const quantity = Number(value.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, error: `Quantité invalide pour « ${product.name} » (1 à ${MAX_QUANTITY}).` };
    }
    const unitPriceCents = typeof value.unitPrice === "string" ? parseEurosToCents(value.unitPrice || "0") : null;
    if (unitPriceCents === null || unitPriceCents > MAX_UNIT_PRICE_CENTS) {
      return { ok: false, error: `Prix invalide pour « ${product.name} » (ex. 155 ou 155,50).` };
    }
    lines.push({ productId: product.id, name: product.name, quantity, unitPriceCents, lineTotalCents: unitPriceCents * quantity });
  }
  return { ok: true, lines, subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0) };
}

/** Lignes pour les fonctions SQL (prix en euros, deux décimales). */
export function linesPayload(lines: SaleLine[]) {
  return lines.map((line) => ({ product_id: line.productId, quantity: line.quantity, unit_price: (line.unitPriceCents / 100).toFixed(2) }));
}

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const DAY = 86_400_000;

/** Date facultative, à venir, dans les 18 mois ; `today` au format AAAA-MM-JJ. */
function futureDate(value: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date invalide.";
  const date = Date.parse(`${value}T12:00:00Z`);
  const start = Date.parse(`${today}T12:00:00Z`);
  if (Number.isNaN(date)) return "Date invalide.";
  if (date < start) return "Choisissez une date à venir.";
  if (date > start + 548 * DAY) return "Choisissez une date dans les 18 prochains mois.";
  return null;
}

function feeCents(form: FormLike, errors: Record<string, string>) {
  const raw = text(form, "deliveryFee");
  if (!raw) return 0;
  const cents = parseEurosToCents(raw);
  if (cents === null || cents > MAX_UNIT_PRICE_CENTS) {
    errors.deliveryFee = "Montant invalide (ex. 35 ou 35,50).";
    return 0;
  }
  return cents;
}

export type ProposalInput = {
  deliveryMethod: "pickup" | "delivery";
  deliveryFeeCents: number;
  requestedDate: string;
  message: string;
};

/** Proposition de modification ; `canDeliver` : la demande a une adresse de livraison. */
export function parseProposal(
  form: FormLike,
  today: string,
  { canDeliver }: { canDeliver: boolean },
): { ok: true; value: ProposalInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const method = text(form, "deliveryMethod");
  if (method !== "pickup" && method !== "delivery") errors.deliveryMethod = "Choisissez le retrait ou la livraison.";
  if (method === "delivery" && !canDeliver) errors.deliveryMethod = "Pas d’adresse de livraison dans cette demande : proposez le retrait.";
  const deliveryMethod = method === "delivery" ? "delivery" : "pickup";
  const deliveryFeeCents = deliveryMethod === "delivery" ? feeCents(form, errors) : 0;
  const requestedDate = text(form, "requestedDate");
  const dateError = requestedDate ? futureDate(requestedDate, today) : null;
  if (dateError) errors.requestedDate = dateError;
  const message = text(form, "message");
  if (message.length > 2000) errors.message = "2 000 caractères au maximum.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { deliveryMethod, deliveryFeeCents, requestedDate, message } };
}

export const paymentMethods = ["Virement", "Espèces", "Chèque", "Carte bancaire", "Autre"] as const;

/** Où en est une vente manuelle au moment de la saisie. */
export const manualSaleSteps = {
  delivered: "Déjà remise au client",
  ready: "Prête, à retirer",
  preparing: "À préparer",
} as const;

export type ManualSaleStep = keyof typeof manualSaleSteps;

export type ManualSaleInput = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  professionalId: string;
  deliveryMethod: "pickup" | "delivery";
  addressLine1: string;
  postalCode: string;
  city: string;
  deliveryFeeCents: number;
  step: ManualSaleStep;
  requestedDate: string;
  paid: boolean;
  paymentMethod: string;
  note: string;
};

/** Vente manuelle (marché, téléphone, virement) ; `today` au format AAAA-MM-JJ. */
export function parseManualSale(
  form: FormLike,
  today: string,
): { ok: true; value: ManualSaleInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = text(form, "name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) errors.name = "Indiquez le nom du client (2 à 120 caractères).";
  const email = normalizeEmail(text(form, "email"));
  if (email && !isValidEmail(email)) errors.email = "Adresse email invalide.";
  const phone = text(form, "phone");
  if (phone && (!/^\+?[0-9 .()-]{6,30}$/.test(phone) || (phone.match(/[0-9]/g)?.length ?? 0) < 6)) errors.phone = "Numéro de téléphone invalide.";
  const companyName = text(form, "companyName");
  if (companyName.length > 120) errors.companyName = "120 caractères au maximum.";
  const professionalId = text(form, "professionalId");
  if (professionalId && !/^[A-Za-z0-9 .\-/]{2,40}$/.test(professionalId)) errors.professionalId = "Lettres, chiffres et tirets uniquement (40 au maximum).";

  const deliveryMethod = text(form, "deliveryMethod") === "delivery" ? "delivery" : "pickup";
  const addressLine1 = deliveryMethod === "delivery" ? text(form, "addressLine1") : "";
  const postalCode = deliveryMethod === "delivery" ? text(form, "postalCode").replace(/\s/g, "") : "";
  const city = deliveryMethod === "delivery" ? text(form, "city") : "";
  if (deliveryMethod === "delivery") {
    if (addressLine1.length < 3 || addressLine1.length > 200) errors.addressLine1 = "Indiquez l’adresse de livraison.";
    if (!/^\d{5}$/.test(postalCode)) errors.postalCode = "Code postal à 5 chiffres.";
    if (city.length < 2 || city.length > 100) errors.city = "Indiquez la ville.";
  }
  const deliveryFeeCents = deliveryMethod === "delivery" ? feeCents(form, errors) : 0;

  const rawStep = text(form, "step");
  const step: ManualSaleStep = Object.hasOwn(manualSaleSteps, rawStep) ? (rawStep as ManualSaleStep) : "delivered";
  // Une vente déjà remise n'a pas de date de retrait ou de livraison à venir.
  const requestedDate = step === "delivered" ? "" : text(form, "requestedDate");
  const dateError = requestedDate ? futureDate(requestedDate, today) : null;
  if (dateError) errors.requestedDate = dateError;

  const paid = form.get("paid") === "on";
  const method = text(form, "paymentMethod");
  const paymentMethod = paid ? ((paymentMethods as readonly string[]).includes(method) ? method : "Autre") : "";
  const note = text(form, "note");
  if (note.length > 2000) errors.note = "2 000 caractères au maximum.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, email, phone, companyName, professionalId, deliveryMethod, addressLine1, postalCode, city, deliveryFeeCents, step, requestedDate, paid, paymentMethod, note },
  };
}

/** Montant d'une ligne saisie (prix illisible : null). */
export function draftLineCents(line: Pick<DraftLine, "quantity" | "unitPrice">): number | null {
  const price = parseEurosToCents(line.unitPrice || "0");
  return price === null || !Number.isInteger(line.quantity) || line.quantity < 1 ? null : price * line.quantity;
}
