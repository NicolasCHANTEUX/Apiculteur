// Formulaire de dépôt d'avis et réglages des demandes d'avis. Sans
// dépendance à Next (testable).

type FormLike = { get(name: string): FormDataEntryValue | null };

export const MAX_REVIEW_COMMENT = 2000;

/** « Claire Martin » → « Claire M. » ; un seul mot reste tel quel. */
export function defaultDisplayName(fullName: string) {
  const words = fullName.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0].slice(0, 30);
  const last = words.at(-1);
  return words.length > 1 && last ? `${first} ${last[0].toLocaleUpperCase("fr-FR")}.` : first;
}

export type ReviewInput = { rating: number; comment: string; displayName: string; consent: boolean };

export function parseReviewForm(form: FormLike): { ok: true; value: ReviewInput } | { ok: false; errors: Record<string, string> } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const errors: Record<string, string> = {};

  const rating = Number(text("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Choisissez une note de 1 à 5 étoiles.";

  const comment = text("comment").replace(/\r\n/g, "\n");
  if (comment.length > MAX_REVIEW_COMMENT) errors.comment = "2 000 caractères au maximum.";

  const displayName = text("displayName").replace(/\s+/g, " ");
  if (displayName.length < 2 || displayName.length > 40) errors.displayName = "Indiquez le nom à afficher (2 à 40 caractères), par exemple « Claire M. ».";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { rating, comment, displayName, consent: form.get("consent") === "on" } };
}

/** Délais proposés pour la demande d'avis ; 0 : pas de demande automatique. */
export const reviewDelayChoices = [0, 3, 7, 14, 30] as const;

export function parseReviewDelay(value: unknown) {
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 && days <= 90 ? days : 7;
}

export const reviewStatusLabels = {
  pending: "À modérer",
  displayed: "Publié",
  hidden: "Masqué",
  refused: "Refusé",
} as const;

export type ReviewStatus = keyof typeof reviewStatusLabels;

export function isReviewStatus(value: string): value is ReviewStatus {
  return Object.hasOwn(reviewStatusLabels, value);
}

/** Nom affiché après anonymisation. */
export const ANONYMOUS_NAME = "Client vérifié";
