import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseConfig } from "./env";

// Les lectures du site public ne doivent pas dependre des cookies de session.
// Une session expiree ou invalide ne doit pas casser le catalogue ou les avis.
export function createPublicClient() {
  const { url, anonKey } = requirePublicSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
