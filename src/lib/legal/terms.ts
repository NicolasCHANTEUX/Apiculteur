// Acceptation des CGV au moment d'une demande de commande (CAHIER §19).
// Sans dépendance à Next ni à Supabase (testable).

/** État des informations légales lu au moment de l'envoi. */
export type TermsState =
  | { status: "published"; version: number }
  | { status: "none" }
  /** Lecture impossible : on ne sait pas si des CGV sont publiées. */
  | { status: "unavailable" };

export type TermsCheck =
  | { ok: true; version: number | null }
  | { ok: false; reason: "unavailable" | "changed" | "not-accepted" };

/**
 * Une demande n'est acceptée que si l'on sait qu'aucune CGV n'est publiée,
 * ou si la version en vigueur, celle affichée au client, a été acceptée.
 * Une lecture impossible bloque l'envoi plutôt que d'enregistrer une
 * commande sans CGV.
 */
export function checkTermsAcceptance(state: TermsState, form: { termsVersion: unknown; accepted: boolean }): TermsCheck {
  if (state.status === "unavailable") return { ok: false, reason: "unavailable" };
  if (state.status === "none") return { ok: true, version: null };
  // Version différente de celle affichée (ou CGV non affichées) : la page
  // doit être rechargée pour que le client les lise.
  if (form.termsVersion !== String(state.version)) return { ok: false, reason: "changed" };
  if (!form.accepted) return { ok: false, reason: "not-accepted" };
  return { ok: true, version: state.version };
}
