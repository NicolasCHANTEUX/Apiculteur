import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseConfig } from "./env";

/**
 * Client Supabase pour les Client Components (navigateur).
 * A instancier à l'intérieur du composant / hook qui l'utilise,
 * pas au niveau module (voir doc Supabase SSR).
 */
export function createClient() {
  const { url, anonKey } = requirePublicSupabaseConfig();

  return createBrowserClient(url, anonKey);
}
