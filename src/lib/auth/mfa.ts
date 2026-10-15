// Double authentification de l'espace apiculteur (code à usage unique,
// TOTP). Sans dépendance à Next ni à Supabase (testable).

export type MfaMode = "verify" | "enroll";

/** Code à 6 chiffres saisi ; espaces et tirets tolérés (« 123 456 »). */
export function parseTotpCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

/** Page de double authentification, puis retour vers `target`. */
export function mfaPath(mode: MfaMode, target: string): string {
  const page = mode === "verify" ? "/connexion/verification" : "/connexion/double-authentification";
  return `${page}?redirect=${encodeURIComponent(target)}`;
}

/** Secret affiché en groupes de 4 pour une saisie à la main dans l'application. */
export function formatTotpSecret(secret: string): string {
  return secret.replace(/\s/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}
