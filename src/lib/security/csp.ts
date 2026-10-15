// Politique de sécurité du contenu (CSP), envoyée par proxy.ts avec un nonce
// propre à chaque requête (node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md). Sans dépendance à Next (testable).
//
// Scripts : seuls ceux qui portent le nonce (Next.js les marque lui-même) et
// ceux qu'ils chargent ('strict-dynamic') ; plus de 'unsafe-inline'. Styles :
// 'unsafe-inline' reste nécessaire pour les attributs style (zoom de la
// galerie, graphiques), qu'un nonce ne couvre pas.

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

/** Origine Supabase autorisée (images du stockage, appels du navigateur). */
export function supabaseOrigin(url: string | undefined): string {
  try {
    return new URL(url ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}

export function buildContentSecurityPolicy({ nonce, dev, supabase }: { nonce: string; dev: boolean; supabase: string }): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' en développement seulement (outils de React).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
