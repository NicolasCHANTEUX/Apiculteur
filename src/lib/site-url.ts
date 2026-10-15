import "server-only";

import { headers } from "next/headers";
import { configuredSiteOrigin } from "@/lib/security/site-origin";

/**
 * Origine publique du site pour les liens absolus (emails, redirections
 * Supabase). En production, uniquement la configuration (voir
 * configuredSiteOrigin) : sans adresse https, la fonction échoue plutôt que
 * de reprendre un en-tête de la requête. En développement, l'hôte de la
 * requête sert de repli (localhost, aperçus).
 */
export async function getSiteUrl(): Promise<string> {
  const configured = configuredSiteOrigin(process.env);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Adresse du site manquante : renseignez NEXT_PUBLIC_SITE_URL (https) sur l’hébergement.");
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
