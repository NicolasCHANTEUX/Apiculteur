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
 * Identité vérifiée auprès de Supabase Auth (getUser, pas getSession), puis
 * rôle lu en base via is_admin(), qui s'appuie uniquement sur la table
 * admin_users liée à l'identifiant Auth. Ni l'email ni le contenu du JWT ne
 * donnent de droits. Mis en cache pour la durée d'une requête.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  if (!getPublicSupabaseConfig()) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "anonymous" };

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) {
    throw new Error(`Vérification des droits impossible: ${error.message}`);
  }

  return isAdmin === true
    ? { status: "admin", userId: user.id, email: user.email ?? null }
    : { status: "forbidden", email: user.email ?? null };
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
