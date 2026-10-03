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

// IP du client : premier élément de X-Forwarded-For (ajouté par l'hébergeur),
// sinon X-Real-IP. « unknown » regroupe les requêtes sans IP connue.
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
