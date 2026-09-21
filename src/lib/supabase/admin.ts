import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseConfig } from "./env";

export function createAdminClient() {
  const { url } = requirePublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Configuration Supabase serveur absente. Renseignez SUPABASE_SERVICE_ROLE_KEY dans .env.local.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
