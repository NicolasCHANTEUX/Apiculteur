import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseConfig } from "./env";

/**
 * Rafraîchit la session Supabase à chaque requête et propage les cookies
 * mis à jour vers la requête et la réponse. Appelé depuis src/proxy.ts
 * (le fichier proxy.js/ts racine, anciennement middleware.js/ts avant
 * Next.js 16 — voir node_modules/next/dist/docs/.../proxy.md).
 */
export async function updateSession(request: NextRequest) {
  const config = getPublicSupabaseConfig();

  // L'application reste consultable avant la configuration du projet local.
  // Les pages dependant de Supabase affichent alors un etat explicite.
  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne pas retirer cet appel. getUser() revalide le token
  // auprès de Supabase et le rafraîchit si besoin ; sans lui, les sessions
  // admin peuvent expirer de façon imprévisible.
  await supabase.auth.getUser();

  return supabaseResponse;
}
