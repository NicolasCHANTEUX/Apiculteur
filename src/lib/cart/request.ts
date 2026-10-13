// Messages pré-remplis du formulaire de contact (demande depuis le panier,
// question sur un produit), en attendant la commande en ligne (lot 4).
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

/** Lien vers le contact, avec un sujet et un message pré-remplis. */
export function contactHref(subject: string, message: string): string {
  return `/contact?${new URLSearchParams({ sujet: subject, message }).toString()}`;
}
