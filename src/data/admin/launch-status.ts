import "server-only";

import { getPublicSupabaseConfig } from "@/lib/supabase/env";

export type LaunchCheck = {
  label: string;
  state: "ok" | "todo" | "later";
  detail: string;
};

function isHttpsUrl(value: string | undefined) {
  try {
    return new URL(value ?? "").protocol === "https:";
  } catch {
    return false;
  }
}

// Seule la présence des réglages est inspectée : aucune valeur n'est lue ni
// affichée. Les fonctions pas encore développées pointent vers leur lot.
export function getLaunchChecks(): LaunchCheck[] {
  return [
    {
      label: "Base de données (Supabase)",
      state: getPublicSupabaseConfig() ? "ok" : "todo",
      detail: "Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    },
    {
      label: "Clé serveur Supabase",
      state: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "todo",
      detail: "Nécessaire à la limitation de débit et au journal d’audit.",
    },
    {
      label: "Secret de limitation de débit",
      state: process.env.RATE_LIMIT_SECRET ? "ok" : "todo",
      detail: "RATE_LIMIT_SECRET dédié (sinon la clé serveur est utilisée).",
    },
    {
      label: "Adresse publique du site",
      state: isHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL) ? "ok" : "todo",
      detail: "NEXT_PUBLIC_SITE_URL en https, utilisée dans les emails.",
    },
    { label: "Commandes en ligne", state: "later", detail: "Lots 3 à 5." },
    { label: "Emails aux clients", state: "later", detail: "Lot 6." },
    { label: "Pages légales", state: "later", detail: "Lot 9 — identité réelle à fournir." },
    { label: "Factures", state: "later", detail: "Lot 11 — validation fiscale requise." },
    { label: "Référencement", state: "later", detail: "Lot 15 — désactivé par défaut." },
    { label: "Paiement en ligne", state: "later", detail: "Lot 17 — selon décision." },
  ];
}
