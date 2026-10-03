import "server-only";

import { headers } from "next/headers";

/**
 * Origine publique du site pour les liens absolus (emails, redirections
 * Supabase). NEXT_PUBLIC_SITE_URL prime ; à défaut, on reprend l'hôte de la
 * requête (développement local, aperçus).
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Valeur invalide : on retombe sur l'hôte de la requête.
    }
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}
