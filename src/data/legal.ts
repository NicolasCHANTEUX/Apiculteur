import "server-only";

import { cache } from "react";
import { getEmailConfig } from "@/data/email";
import { emailProviders } from "@/lib/email/driver";
import { normalizeLegalConfig, type LegalConfig } from "@/lib/legal/config";
import type { LegalContext } from "@/lib/legal/documents";
import { infoNav, site, type NavLink } from "@/lib/site";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// Version publiée des informations légales (CAHIER §19). Sans version
// approuvée, les pages légales n'existent pas (404) et disparaissent du
// pied de page et des formulaires.

export type PublishedLegal = { version: number; approvedAt: string; config: LegalConfig };

export const getPublishedLegal = cache(async (): Promise<PublishedLegal | null> => {
  if (!getPublicSupabaseConfig()) return null;
  const { data, error } = await createPublicClient()
    .from("legal_versions")
    .select("version, config, approved_at")
    .order("version", { ascending: false })
    .limit(1);
  if (error) {
    // Table absente tant que la migration du lot 9 n'est pas appliquée.
    if (error.code !== "PGRST205" && error.code !== "42P01") console.error("Informations légales", error.code, error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  return { version: row.version as number, approvedAt: row.approved_at as string, config: normalizeLegalConfig(row.config) };
});

const LEGAL_PAGES = ["/cgv", "/mentions-legales", "/confidentialite"];

/** Liens « Informations » du pied de page, sans les pages légales non publiées. */
export async function getInfoNav(): Promise<NavLink[]> {
  const published = await getPublishedLegal();
  return infoNav.filter((link) => published || !LEGAL_PAGES.includes(link.href));
}

/** Contexte des documents : adresse du site, version, service d'emails. */
export function legalContext(published: { version: number; approvedAt: string }, siteUrl: string): LegalContext {
  const provider = getEmailConfig().provider;
  return {
    siteName: site.name,
    siteUrl,
    version: published.version,
    approvedAt: published.approvedAt,
    emailProvider: provider ? emailProviders[provider] : null,
  };
}

/** Adresse publique du site pour les documents (sans dépendre de la requête : pages statiques). */
export function publicSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return "https://www.example.invalid";
  }
}
