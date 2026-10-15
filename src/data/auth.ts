import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { mfaPath, type MfaMode } from "@/lib/auth/mfa";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AdminAccess =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "forbidden"; email: string | null }
  /** Compte administrateur connecté par mot de passe : code à saisir ou application à configurer. */
  | { status: "mfa"; mode: MfaMode; email: string | null }
  | { status: "admin"; userId: string; email: string | null };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * État d'accès d'un compte connecté, vérifié par la base : « admin »
 * seulement après la double authentification (jeton aal2, migration
 * 20261020100000_security.sql). Sans cette migration, la fonction
 * admin_access_state n'existe pas : retour à l'ancien contrôle is_admin().
 */
export async function resolveAccessState(supabase: ServerClient): Promise<"admin" | "none" | { mfa: MfaMode }> {
  const { data, error } = await supabase.rpc("admin_access_state");
  if (error?.code === "PGRST202") {
    const { data: isAdmin, error: legacyError } = await supabase.rpc("is_admin");
    if (legacyError) throw new Error(`Vérification des droits impossible: ${legacyError.message}`);
    return isAdmin === true ? "admin" : "none";
  }
  if (error) throw new Error(`Vérification des droits impossible: ${error.message}`);
  if (data === "admin") return "admin";
  if (data !== "mfa") return "none";
  // Code demandé si une application est déjà associée, sinon configuration.
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw new Error(`Double authentification indisponible: ${factorsError.message}`);
  return { mfa: factors.totp.length > 0 ? "verify" : "enroll" };
}

/**
 * Identité vérifiée par getClaims() (pas getSession) : signature du jeton
 * contrôlée avec la clé publique du projet, sans appel réseau (ou par
 * Supabase Auth si la clé est symétrique). Droits lus ensuite en base, qui
 * s'appuie sur la table admin_users et sur le niveau d'authentification du
 * jeton ; ni l'email ni le contenu du JWT ne donnent de droits. Mis en cache
 * pour la durée d'une requête.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  if (!getPublicSupabaseConfig()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsError ? null : data?.claims;
  if (!claims?.sub) return { status: "anonymous" };
  const email = typeof claims.email === "string" ? claims.email : null;

  const state = await resolveAccessState(supabase);
  if (state === "admin") return { status: "admin", userId: claims.sub, email };
  if (state === "none") return { status: "forbidden", email };
  return { status: "mfa", mode: state.mfa, email };
});

/**
 * À appeler en tête de chaque page, action et lecture de l'administration.
 * Un visiteur est renvoyé vers la connexion ; un administrateur sans double
 * authentification vers la saisie (ou la configuration) du code ; un compte
 * sans droit vers la page de refus.
 */
export async function requireAdmin(path?: string) {
  const access = await getAdminAccess();
  // Sans chemin précisé (gabarit de l'admin), la page demandée, transmise par
  // proxy.ts : retour au bon endroit après la connexion.
  const requested = sanitizeRedirectPath((await headers()).get("x-request-path"), "/admin");
  const nextPath = path ?? (requested.startsWith("/admin") ? requested : "/admin");

  if (access.status === "anonymous") {
    redirect(`/connexion?redirect=${encodeURIComponent(nextPath)}`);
  }
  if (access.status === "mfa") {
    redirect(mfaPath(access.mode, nextPath));
  }
  if (access.status !== "admin") {
    redirect("/acces-refuse");
  }

  return { userId: access.userId, email: access.email };
}
