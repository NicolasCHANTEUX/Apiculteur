"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { getAdminAccess } from "@/data/auth";
import { parseTotpCode } from "@/lib/auth/mfa";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { RateLimitError, currentClientIp, enforceRateLimit } from "@/lib/security/guards";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Double authentification de l'espace apiculteur (code à usage unique d'une
// application comme Google Authenticator, Microsoft Authenticator ou
// 2FAS). Le code fait passer la session au niveau aal2, seul niveau auquel
// la base accorde les droits d'administration (is_admin).

export type MfaFormState = { status: "idle" | "error"; message: string };
export type MfaEnrollment = { status: "ready"; factorId: string; qrCode: string; secret: string } | { status: "error"; message: string };

const UNAVAILABLE = "Service momentanément indisponible. Réessayez dans un instant.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(message: string): MfaFormState {
  return { status: "error", message };
}

function mfaErrorMessage(error: AuthError) {
  switch (error.code) {
    case "mfa_verification_failed":
    case "mfa_challenge_expired":
      return "Code incorrect ou expiré. Saisissez le code affiché en ce moment dans l’application.";
    case "over_request_rate_limit":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La double authentification n’est pas activée sur le projet Supabase (Authentication → Multi-Factor).";
    default:
      return UNAVAILABLE;
  }
}

/** Quotas : par compte et par IP. Une panne de la limitation bloque (refus par défaut). */
async function limit(scope: string, userKey: string): Promise<string | null> {
  try {
    const ip = await currentClientIp();
    await enforceRateLimit({ scope: `${scope}-ip`, identifier: ip, limit: 30, windowSeconds: 15 * 60 });
    await enforceRateLimit({ scope, identifier: userKey, limit: 10, windowSeconds: 15 * 60 });
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) return error.message;
    console.error("Double authentification : limitation indisponible", error);
    return UNAVAILABLE;
  }
}

/** Saisie du code à chaque connexion (application déjà associée). */
export async function verifyMfaAction(_previous: MfaFormState, formData: FormData): Promise<MfaFormState> {
  const target = sanitizeRedirectPath(formData.get("redirect"), "/admin");
  const access = await getAdminAccess();
  if (access.status === "admin") redirect(target);
  if (access.status !== "mfa" || access.mode !== "verify") redirect("/connexion");

  const code = parseTotpCode(formData.get("code"));
  if (!code) return failure("Saisissez les 6 chiffres affichés dans l’application.");

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (listError || !factor) return failure(UNAVAILABLE);
  const limited = await limit("mfa-verify", factor.id);
  if (limited) return failure(limited);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return failure(mfaErrorMessage(error));
  redirect(target);
}

/**
 * Première connexion : nouvelle application à associer (QR code et clé).
 * Une configuration commencée mais jamais confirmée est remplacée.
 */
export async function startMfaEnrollmentAction(): Promise<MfaEnrollment> {
  const access = await getAdminAccess();
  if (access.status !== "mfa" || access.mode !== "enroll") {
    return { status: "error", message: "Rechargez la page : la double authentification est peut-être déjà configurée." };
  }
  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { status: "error", message: UNAVAILABLE };
  const limited = await limit("mfa-enroll", access.email ?? "inconnu");
  if (limited) return { status: "error", message: limited };

  for (const stale of factors.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Espace apiculteur ${new Date().toISOString().slice(0, 16)}`,
    issuer: site.name,
  });
  if (error || !data) {
    console.error("Double authentification : inscription", error?.code, error?.message);
    return { status: "error", message: error ? mfaErrorMessage(error) : UNAVAILABLE };
  }
  return { status: "ready", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Confirmation de l'application associée par un premier code. */
export async function confirmMfaEnrollmentAction(_previous: MfaFormState, formData: FormData): Promise<MfaFormState> {
  const target = sanitizeRedirectPath(formData.get("redirect"), "/admin");
  const access = await getAdminAccess();
  if (access.status === "admin") redirect(target);
  if (access.status !== "mfa" || access.mode !== "enroll") redirect("/connexion");

  const factorId = formData.get("factorId");
  if (typeof factorId !== "string" || !UUID.test(factorId)) return failure("Recommencez la configuration.");
  const code = parseTotpCode(formData.get("code"));
  if (!code) return failure("Saisissez les 6 chiffres affichés dans l’application.");
  const limited = await limit("mfa-verify", factorId);
  if (limited) return failure(limited);

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return failure(mfaErrorMessage(error));
  redirect(target === "/admin" ? "/admin?double-authentification=activee" : target);
}
