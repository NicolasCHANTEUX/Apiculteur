// Vérification d'origine pour les Route Handlers qui modifient des données.
// Les Server Actions sont déjà protégées par Next.js (comparaison Origin /
// Host, cf. node_modules/next/dist/docs/01-app/02-guides/server-actions.md) ;
// les routes API ne le sont pas.

export function isSameOrigin(input: {
  origin: string | null;
  host: string | null;
  forwardedHost?: string | null;
}): boolean {
  if (!input.origin) return false;

  // Derrière un proxy (Vercel…), l'hôte public est dans X-Forwarded-Host.
  const expectedHost = (input.forwardedHost?.split(",")[0] ?? input.host)
    ?.trim()
    .toLowerCase();
  if (!expectedHost) return false;

  try {
    const origin = new URL(input.origin);
    if (origin.protocol !== "https:" && origin.protocol !== "http:") {
      return false;
    }
    return origin.host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}
