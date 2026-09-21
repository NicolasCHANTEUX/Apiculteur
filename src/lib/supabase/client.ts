import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour les Client Components (navigateur).
 * A instancier à l'intérieur du composant / hook qui l'utilise,
 * pas au niveau module (voir doc Supabase SSR).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
