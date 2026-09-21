import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicSupabaseConfig } from "./env";

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 * Toujours en créer une nouvelle instance par requête (ne pas mettre en cache
 * au niveau module).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicSupabaseConfig();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll() appelé depuis un Server Component : sans effet si
            // le proxy (src/proxy.ts) rafraîchit déjà la session à chaque
            // requête, ce qui est le cas ici.
          }
        },
      },
    },
  );
}
