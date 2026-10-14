// Brouillon d’email libre au client depuis la fiche commande (bouton
// « Écrire au client », lien mailto), en plus des emails automatiques de
// chaque étape (src/lib/email). Sans dépendance à Next (testable).

import type { OrderStateKey } from "./labels.ts";

export type DraftInput = {
  number: string;
  customerName: string;
  state: OrderStateKey;
  lines: { name: string; quantity: number }[];
  signature: string;
};

const openings: Record<OrderStateKey, { subject: string; text: string }> = {
  to_validate: { subject: "Votre demande", text: "J’ai bien reçu votre demande et je reviens vers vous à son sujet." },
  preparing: { subject: "Votre demande est acceptée", text: "Bonne nouvelle : votre demande est acceptée. Convenons ensemble du retrait ou de la livraison." },
  ready: { subject: "Votre commande est prête", text: "Votre commande est prête. Convenons ensemble du moment du retrait ou de la livraison." },
  shipped: { subject: "Votre commande est en route", text: "Votre commande est en route." },
  done: { subject: "Merci pour votre commande", text: "Merci encore pour votre confiance. N’hésitez pas à me donner des nouvelles de vos colonies." },
  refused: { subject: "Votre demande", text: "Je ne suis malheureusement pas en mesure de donner suite à votre demande." },
  cancelled: { subject: "Annulation de votre commande", text: "Je vous confirme l’annulation de votre commande." },
};

export function customerEmailDraft(input: DraftInput): { subject: string; body: string } {
  const opening = openings[input.state];
  return {
    subject: `${opening.subject} — ${input.number}`,
    body: [
      `Bonjour ${input.customerName},`,
      "",
      opening.text,
      "",
      `Demande ${input.number} :`,
      ...input.lines.map((line) => `- ${line.quantity} × ${line.name}`),
      "",
      "Bien cordialement,",
      input.signature,
    ].join("\n"),
  };
}

export function mailtoHref(email: string, draft: { subject: string; body: string }) {
  return `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}
