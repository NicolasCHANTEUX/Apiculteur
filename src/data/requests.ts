import "server-only";

import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Disponibilité du formulaire de demande (CAHIER §12.1) : sans base prête,
// le site garde l'ancien formulaire qui ouvre la messagerie ; sans bucket
// privé vérifié, les demandes partent sans photos. Résultats gardés quelques
// minutes pour ne pas interroger Supabase à chaque affichage.

export const REQUEST_PHOTOS_BUCKET = "request-photos";

type Check = { ok: boolean; until: number };
const checks = new Map<string, Check>();

async function cached(name: string, run: () => Promise<boolean>) {
  const now = Date.now();
  const known = checks.get(name);
  if (known && known.until > now) return known.ok;
  let ok = false;
  try {
    ok = await run();
  } catch (error) {
    console.error(`Demandes : contrôle « ${name} » impossible`, error instanceof Error ? error.message : error);
  }
  // Un échec est revérifié vite : la migration vient peut-être d'être appliquée.
  checks.set(name, { ok, until: now + (ok ? 5 * 60_000 : 30_000) });
  return ok;
}

function serverConfigured() {
  return Boolean(getPublicSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Table des demandes présente (migration 20261015100000_contact_requests.sql). */
export async function requestFormReady() {
  if (!serverConfigured()) return false;
  return cached("table", async () => {
    // Vraie lecture (GET) : sur une requête HEAD, supabase-js change une
    // table introuvable (404 sans corps) en « aucun résultat », sans erreur.
    const { error } = await createAdminClient().from("contact_requests").select("id").limit(1);
    if (error && error.code !== "PGRST205" && error.code !== "42P01") console.error("Demandes : table", error.code, error.message);
    return !error;
  });
}

/** Bucket des photos présent et **privé** : vérifié avant tout envoi de photo. */
export async function requestPhotosReady() {
  if (!serverConfigured()) return false;
  return cached("bucket", async () => {
    const { data, error } = await createAdminClient().storage.getBucket(REQUEST_PHOTOS_BUCKET);
    if (error || !data) return false;
    if (data.public) {
      console.error("Demandes : le bucket des photos est public, envoi de photos désactivé.");
      return false;
    }
    return true;
  });
}

export async function getRequestFormAvailability() {
  const form = await requestFormReady();
  return { form, photos: form && (await requestPhotosReady()) };
}
