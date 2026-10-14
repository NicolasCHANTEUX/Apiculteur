// Demandes clients (CAHIER §12, ROADMAP lot 7) : types, statuts, validation
// du formulaire public et présentation des détails. Sans dépendance à Next
// ni à Supabase (testable).

import { isValidEmail, normalizeEmail } from "../auth/validation.ts";

export const requestKinds = {
  contact: { label: "Une question", short: "Question", slug: "question", hint: "Un essaim, une commande, la livraison…" },
  quote: { label: "Un devis", short: "Devis", slug: "devis", hint: "Grande quantité ou professionnel" },
  swarm: { label: "Un essaim à récupérer", short: "Essaim", slug: "essaim", hint: "Un essaim s’est posé chez vous" },
} as const;

export type RequestKind = keyof typeof requestKinds;

export function isRequestKind(value: string): value is RequestKind {
  return Object.hasOwn(requestKinds, value);
}

/** Type demandé par l'adresse (`?type=devis`), ou déduit de l'ancien sujet pré-rempli. */
export function kindFromParams(type: string, subject: string): RequestKind {
  const bySlug = (Object.keys(requestKinds) as RequestKind[]).find((kind) => requestKinds[kind].slug === type);
  if (bySlug) return bySlug;
  if (subject === "Grande quantité") return "quote";
  return "contact";
}

export const contactSubjects = [
  "Question sur un essaim",
  "Commande ou réservation",
  "Livraison ou retrait",
  "Facture",
  "Autre demande",
] as const;

export const requestStatuses = {
  new: "Nouvelle",
  in_progress: "En cours",
  answered: "Réponse envoyée",
  closed: "Clôturée",
} as const;

export type RequestStatus = keyof typeof requestStatuses;

export function isRequestStatus(value: string): value is RequestStatus {
  return Object.hasOwn(requestStatuses, value);
}

export const swarmHeights = {
  ground: "À hauteur d’homme",
  low: "Moins de 3 mètres",
  high: "Plus de 3 mètres",
  unknown: "Je ne sais pas",
} as const;

export const swarmSince = {
  today: "Aujourd’hui",
  yesterday: "Depuis hier",
  days: "Depuis plusieurs jours",
  unknown: "Je ne sais pas",
} as const;

export type QuoteDetails = { quantity: number; variety: string; period: string; location: string; budget: string; company: string };
export type SwarmDetails = { location: string; height: keyof typeof swarmHeights; since: keyof typeof swarmSince };

export type ContactRequestInput = {
  kind: RequestKind;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  details: Record<string, string | number>;
};

type FormLike = { get(name: string): FormDataEntryValue | null };

export const MIN_MESSAGE_LENGTH = 20;
export const MAX_MESSAGE_LENGTH = 5000;

function clip(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value;
}

/** Valide le formulaire ; `productName` : produit d'où vient la demande, s'il y en a un. */
export function parseContactRequest(
  form: FormLike,
  productName: string | null = null,
): { ok: true; value: ContactRequestInput } | { ok: false; errors: Record<string, string> } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const errors: Record<string, string> = {};

  const rawKind = text("kind");
  const kind: RequestKind = isRequestKind(rawKind) ? rawKind : "contact";
  if (!isRequestKind(rawKind)) errors.kind = "Choisissez le type de demande.";

  const name = text("name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) errors.name = "Indiquez votre nom (2 à 120 caractères).";

  const email = normalizeEmail(text("email"));
  if (!isValidEmail(email)) errors.email = "Adresse email invalide.";

  const phone = text("phone");
  const phoneValid = /^\+?[0-9 .()-]{6,30}$/.test(phone) && (phone.match(/[0-9]/g)?.length ?? 0) >= 6;
  if (phone && !phoneValid) errors.phone = "Numéro de téléphone invalide.";
  if (!phone && kind === "swarm") errors.phone = "Indiquez un numéro : je vous appelle pour organiser la récupération.";

  const message = text("message").replace(/\r\n/g, "\n");
  if (message.length < MIN_MESSAGE_LENGTH) errors.message = `Quelques mots de plus, s’il vous plaît (${MIN_MESSAGE_LENGTH} caractères au moins).`;
  if (message.length > MAX_MESSAGE_LENGTH) errors.message = "5 000 caractères au maximum.";

  if (form.get("consent") !== "on") errors.consent = "Cochez cette case pour que je puisse vous répondre.";

  let subject = "";
  let details: Record<string, string | number> = {};

  if (kind === "contact") {
    const chosen = text("subject");
    subject = (contactSubjects as readonly string[]).includes(chosen) ? chosen : "Autre demande";
  }

  if (kind === "quote") {
    const rawQuantity = text("quantity");
    const quantity = Number(rawQuantity);
    if (!/^\d{1,5}$/.test(rawQuantity) || quantity < 1 || quantity > 10000) errors.quantity = "Indiquez une quantité (nombre entier).";
    const fields = { variety: 80, period: 80, location: 120, budget: 80, company: 120 } as const;
    const values = Object.fromEntries(Object.entries(fields).map(([field, max]) => {
      const value = text(field);
      if (value.length > max) errors[field] = `${max} caractères au maximum.`;
      return [field, value];
    })) as Record<keyof typeof fields, string>;
    details = { quantity, ...values };
    const what = values.variety || productName || "essaims";
    subject = clip(`Devis : ${Number.isFinite(quantity) ? quantity : "?"} × ${what}`, 120);
  }

  if (kind === "swarm") {
    const location = text("location");
    if (location.length < 3 || location.length > 200) errors.location = "Indiquez l’adresse ou au moins la commune.";
    const height = text("height");
    const since = text("since");
    details = {
      location,
      height: Object.hasOwn(swarmHeights, height) ? height : "unknown",
      since: Object.hasOwn(swarmSince, since) ? since : "unknown",
    };
    subject = clip(`Essaim à récupérer — ${location || "lieu à préciser"}`, 120);
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind, name, email, phone, subject, message, details } };
}

/** Détails propres au type, en lignes « libellé : valeur » (admin, emails). */
export function describeRequestDetails(kind: string, details: Record<string, unknown> | null): [string, string][] {
  const value = (key: string) => {
    const raw = details?.[key];
    return typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
  };
  const rows: [string, string][] = [];
  if (kind === "quote") {
    if (value("quantity")) rows.push(["Quantité", value("quantity")]);
    if (value("variety")) rows.push(["Race ou produit", value("variety")]);
    if (value("period")) rows.push(["Période souhaitée", value("period")]);
    if (value("location")) rows.push(["Lieu", value("location")]);
    if (value("budget")) rows.push(["Budget indicatif", value("budget")]);
    if (value("company")) rows.push(["Exploitation ou entreprise", value("company")]);
  }
  if (kind === "swarm") {
    if (value("location")) rows.push(["Lieu", value("location")]);
    const height = value("height");
    if (height) rows.push(["Hauteur", swarmHeights[height as keyof typeof swarmHeights] ?? height]);
    const since = value("since");
    if (since) rows.push(["Depuis", swarmSince[since as keyof typeof swarmSince] ?? since]);
  }
  return rows;
}

/** Message d'origine cité sous une réponse (texte brut). */
export function quoteMessage(message: string) {
  return message
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}
