import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy racine (anciennement middleware.ts). Rafraîchit la session Supabase
// sur chaque requête concernée par le matcher ci-dessous.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les routes sauf les assets statiques, images optimisées et
    // fichiers d'image courants, pour ne pas ralentir/casser leur chargement.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
