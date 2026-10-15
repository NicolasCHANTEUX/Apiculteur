import { type NextRequest } from "next/server";
import { buildContentSecurityPolicy, createNonce, supabaseOrigin } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy racine (anciennement middleware.ts). À chaque requête de page :
// nonce et politique de sécurité du contenu (CSP), transmis à Next.js qui
// marque ses scripts avec ce nonce ; rafraîchissement de la session Supabase.
export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === "development",
    supabase: supabaseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
  const response = await updateSession(request, {
    "x-nonce": nonce,
    "content-security-policy": csp,
    // Page demandée, pour y revenir après la connexion (voir requireAdmin).
    "x-request-path": `${request.nextUrl.pathname}${request.nextUrl.search}`,
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Toutes les routes sauf les assets statiques, images optimisées,
      // fichiers d'image courants et manifest, pour ne pas ralentir leur
      // chargement ; ni les préchargements de liens, qui n'affichent pas de
      // page.
      source: "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
