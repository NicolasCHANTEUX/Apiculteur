// Règles d'authentification sans dépendance à Next ni à Supabase (testables).

export const MIN_PASSWORD_LENGTH = 10;
// bcrypt (utilisé par Supabase Auth) ignore au-delà de 72 octets.
export const MAX_PASSWORD_BYTES = 72;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return (
    email.length >= 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

/**
 * N'autorise qu'un chemin interne (« /admin/… ») pour la redirection après
 * connexion : jamais d'URL absolue, de « //hote » ni de barre oblique inverse.
 */
export function sanitizeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f]/.test(path) ||
    path.length > 300
  ) {
    return fallback;
  }
  return path;
}

export function validateNewPassword(
  password: unknown,
  confirmation: unknown,
): string | null {
  if (typeof password !== "string" || typeof confirmation !== "string") {
    return "Renseignez et confirmez le nouveau mot de passe.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "Le mot de passe est trop long (72 octets au maximum).";
  }
  if (password.trim() !== password || !/\S/.test(password)) {
    return "Le mot de passe ne doit pas commencer ni finir par une espace.";
  }
  if (password !== confirmation) {
    return "Les deux mots de passe ne correspondent pas.";
  }
  return null;
}
