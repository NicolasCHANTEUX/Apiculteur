import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AdminAccess =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "forbidden"; email: string | null }
  | { status: "admin"; userId: string; email: string | null };

/**
 * Identité vérifiée par getClaims() (pas getSession) : signature du jeton
 * contrôlée avec la clé publique du projet, sans appel réseau (ou par
 * Supabase Auth si la clé est symétrique). Rôle lu ensuite en base via
 * is_admin(), qui s'appuie uniquement sur la table admin_users ; la base
 * revérifie le jeton à cet appel. Ni l'email ni le contenu du JWT ne donnent
 * de droits. Mis en cache pour la durée d'une requête.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  if (!getPublicSupabaseConfig()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsError ? null : data?.claims;
  if (!claims?.sub) return { status: "anonymous" };
  const email = typeof claims.email === "string" ? claims.email : null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) {
    throw new Error(`Vérification des droits impossible: ${error.message}`);
  }

  return isAdmin === true
    ? { status: "admin", userId: claims.sub, email }
    : { status: "forbidden", email };
});

/**
 * À appeler en tête de chaque page, action et lecture de l'administration.
 * Un visiteur est renvoyé vers la connexion ; un compte sans droit vers la
 * page de refus.
 */
export async function requireAdmin(nextPath = "/admin") {
  const access = await getAdminAccess();

  if (access.status === "anonymous") {
    redirect(`/connexion?redirect=${encodeURIComponent(nextPath)}`);
  }
  if (access.status !== "admin") {
    redirect("/acces-refuse");
  }

  return { userId: access.userId, email: access.email };
}
