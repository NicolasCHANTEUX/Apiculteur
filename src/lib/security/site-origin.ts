// Origine publique du site pour les liens absolus des emails (lien de
// réinitialisation, réponse à une proposition, avis). Sans dépendance à Next
// (testable).
//
// En production, jamais tirée des en-têtes de la requête (Host,
// X-Forwarded-Host), qu'un client peut forger : seulement la configuration.

type Env = { NEXT_PUBLIC_SITE_URL?: string; NODE_ENV?: string; VERCEL_PROJECT_PRODUCTION_URL?: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Origine configurée : NEXT_PUBLIC_SITE_URL, en https en production (http
 * toléré pour une machine locale), sinon le domaine de production déclaré
 * par Vercel. null si rien d'utilisable.
 */
export function configuredSiteOrigin(env: Env): string | null {
  const production = env.NODE_ENV === "production";
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || (url.protocol === "http:" && (!production || LOCAL_HOSTS.has(url.hostname)))) {
        return url.origin;
      }
    } catch {
      // Valeur invalide : ignorée.
    }
  }
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production && vercel && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(vercel)) return `https://${vercel}`;
  return null;
}
