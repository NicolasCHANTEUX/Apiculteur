import { createHmac } from "node:crypto";

// Les identifiants de limitation (IP, email) ne sont jamais stockés en clair :
// seule leur empreinte HMAC est enregistrée en base.
export function rateLimitKey(
  secret: string,
  scope: string,
  identifier: string,
): string {
  if (!secret) throw new Error("Secret de limitation de débit manquant.");
  return createHmac("sha256", secret)
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

/**
 * Clé HMAC de la limitation de débit : RATE_LIMIT_SECRET, sinon une clé
 * dérivée de la clé serveur Supabase (jamais la clé elle-même, pour séparer
 * les usages). null si aucune n'est configurée.
 */
export function rateLimitSecret(env: { RATE_LIMIT_SECRET?: string; SUPABASE_SERVICE_ROLE_KEY?: string }): string | null {
  if (env.RATE_LIMIT_SECRET) return env.RATE_LIMIT_SECRET;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY).update("apiculteur:rate-limit:v1").digest("hex");
}

/**
 * IP du client, sans faire confiance à ce qu'il peut écrire lui-même :
 * - sur Vercel, l'en-tête posé par la plateforme (x-vercel-forwarded-for,
 *   puis X-Real-IP et X-Forwarded-For, que Vercel remplace) ;
 * - ailleurs, l'adresse ajoutée par le proxy de confiance, c'est-à-dire la
 *   `trustedHops`-ième en partant de la fin de X-Forwarded-For (un client
 *   peut y ajouter de fausses adresses en tête, pas en fin), sinon X-Real-IP.
 * « unknown » regroupe les requêtes sans IP connue.
 */
export function clientIpFrom(headers: Headers, { vercel = false, trustedHops = 1 }: { vercel?: boolean; trustedHops?: number } = {}): string {
  const first = (name: string) => headers.get(name)?.split(",")[0]?.trim() || null;
  if (vercel) return first("x-vercel-forwarded-for") ?? first("x-real-ip") ?? first("x-forwarded-for") ?? "unknown";
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - Math.max(1, Math.trunc(trustedHops) || 1))];
  return headers.get("x-real-ip")?.trim() || "unknown";
}
