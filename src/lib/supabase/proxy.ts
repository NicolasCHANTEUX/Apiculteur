import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseConfig } from "./env";

/**
 * Rafraîchit la session Supabase à chaque requête et propage les cookies
 * mis à jour vers la requête et la réponse. Appelé depuis src/proxy.ts
 * (le fichier proxy.js/ts racine, anciennement middleware.js/ts avant
 * Next.js 16 — voir node_modules/next/dist/docs/.../proxy.md).
 */
export async function updateSession(request: NextRequest, extraHeaders: Record<string, string> = {}) {
  const config = getPublicSupabaseConfig();
  // Requête transmise à la page, avec les en-têtes ajoutés par le proxy
  // (nonce et CSP) et les cookies de session éventuellement renouvelés.
  const forward = () => {
    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
    return NextResponse.next({ request: { headers } });
  };

  // L'application reste consultable avant la configuration du projet local.
  // Les pages dependant de Supabase affichent alors un etat explicite.
  if (!config) {
    return forward();
  }

  let supabaseResponse = forward();

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
          supabaseResponse = forward();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne pas retirer cet appel. Il rafraîchit la session expirée
  // (nouveaux cookies) ; sans lui, les sessions admin peuvent expirer de
  // façon imprévisible. getClaims() vérifie la signature du jeton avec la clé
  // publique du projet (ES256, gardée en mémoire 10 min) : pas d'appel
  // réseau à chaque requête, contrairement à getUser(). Avec une clé
  // symétrique, il revient de lui-même à getUser().
  await supabase.auth.getClaims();

  return supabaseResponse;
}
