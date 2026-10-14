// Messages pré-remplis du formulaire de contact (demande depuis le panier
// quand les commandes en ligne sont fermées, question sur un produit).
// Sans dépendance à Next (testables).

import { formatEuros } from "../domain/pricing.ts";

export type RequestLine = {
  name: string;
  sku: string | null;
  quantity: number;
  /** null : prix non affiché, à confirmer. */
  unitPriceCents: number | null;
};

export function cartRequestMessage(lines: RequestLine[]): string {
  const priced = lines.filter((line) => line.unitPriceCents !== null);
  const total = priced.reduce((sum, line) => sum + (line.unitPriceCents ?? 0) * line.quantity, 0);
  const rows = lines.map((line) => {
    const reference = line.sku ? ` (réf. ${line.sku})` : "";
    const price =
      line.unitPriceCents === null
        ? "prix à confirmer"
        : `${formatEuros(line.unitPriceCents)} l’unité, soit ${formatEuros(line.unitPriceCents * line.quantity)}`;
    return `- ${line.quantity} × ${line.name}${reference} : ${price}`;
  });
  return [
    "Bonjour,",
    "",
    "Je souhaiterais commander :",
    ...rows,
    "",
    priced.length
      ? `Total estimé : ${formatEuros(total)}${priced.length < lines.length ? " (hors produits à prix à confirmer)" : ""}`
      : "Total : à confirmer",
    "",
    "Retrait ou livraison souhaité :",
    "Date souhaitée :",
    "",
    "Pouvez-vous me confirmer la disponibilité ? Merci.",
  ].join("\n");
}

export function productQuestionMessage(name: string, sku: string | null): string {
  return `Bonjour,\n\nJe souhaiterais des informations sur « ${name} »${sku ? ` (réf. ${sku})` : ""}.\n\n`;
}

/**
 * Lien vers le contact, avec un sujet et un message pré-remplis ; en option
 * le type de demande (`devis`, `essaim`), le produit (slug) et la quantité.
 */
export function contactHref(
  subject: string,
  message: string,
  extra: { type?: "question" | "devis" | "essaim"; product?: string; quantity?: number } = {},
): string {
  const params = new URLSearchParams();
  if (extra.type) params.set("type", extra.type);
  if (subject) params.set("sujet", subject);
  if (message) params.set("message", message);
  if (extra.product) params.set("produit", extra.product);
  if (extra.quantity) params.set("quantite", String(extra.quantity));
  return `/contact?${params.toString()}`;
}
