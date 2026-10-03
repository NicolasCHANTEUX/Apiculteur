"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import {
  isValidEmail,
  normalizeEmail,
  sanitizeRedirectPath,
  validateNewPassword,
} from "@/lib/auth/validation";
import {
  RateLimitError,
  currentClientIp,
  enforceRateLimit,
} from "@/lib/security/guards";
import { getSiteUrl } from "@/lib/site-url";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
  email?: string;
};

const UNAVAILABLE = "Service momentanément indisponible. Réessayez dans un instant.";

function failure(message: string, email?: string): AuthFormState {
  return { status: "error", message, email };
}

function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Cette adresse email n’a pas encore été confirmée.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "same_password":
      return "Choisissez un mot de passe différent de l’ancien.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisissez-en un plus long.";
    default:
      return UNAVAILABLE;
  }
}

// Deux quotas : par IP, et par couple IP + email. Une panne de la limitation
// bloque l'action (refus par défaut) plutôt que de la laisser sans protection.
async function limit(scope: string, email: string, perPair: number, perIp: number, windowSeconds: number) {
  const ip = await currentClientIp();
  await enforceRateLimit({ scope: `${scope}-ip`, identifier: ip, limit: perIp, windowSeconds });
  await enforceRateLimit({ scope, identifier: `${ip}|${email}`, limit: perPair, windowSeconds });
}

async function guardRate(
  run: () => Promise<void>,
  email: string,
): Promise<AuthFormState | null> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) return failure(error.message, email);
    console.error("Limitation de débit indisponible", error);
    return failure(UNAVAILABLE, email);
  }
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getPublicSupabaseConfig()) {
    return failure("L’espace apiculteur n’est pas encore configuré.");
  }

  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  const target = sanitizeRedirectPath(formData.get("redirect"), "/admin");

  if (!isValidEmail(email) || typeof password !== "string" || !password) {
    return failure("Renseignez votre email et votre mot de passe.", email);
  }

  const limited = await guardRate(() => limit("login", email, 8, 30, 15 * 60), email);
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return failure(authErrorMessage(error), email);

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || isAdmin !== true) {
    // Seuls les administrateurs ont un usage de la connexion pour l'instant.
    await supabase.auth.signOut({ scope: "local" });
    return failure(
      roleError ? UNAVAILABLE : "Ce compte n’a pas accès à l’espace apiculteur.",
      email,
    );
  }

  redirect(target);
}

export async function logoutAction() {
  if (getPublicSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/connexion?deconnecte=1");
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getPublicSupabaseConfig()) {
    return failure("L’espace apiculteur n’est pas encore configuré.");
  }

  const email = normalizeEmail(formData.get("email"));
  if (!isValidEmail(email)) {
    return failure("Renseignez une adresse email valide.", email);
  }

  const limited = await guardRate(() => limit("password-reset", email, 5, 20, 60 * 60), email);
  if (limited) return limited;

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/nouveau-mot-de-passe")}`,
  });

  // Même réponse que le compte existe ou non : on ne révèle pas quelles
  // adresses ont un compte. Seule une limite d'envoi est signalée.
  if (error?.code === "over_email_send_rate_limit") {
    return failure(authErrorMessage(error), email);
  }
  if (error) console.error("Réinitialisation du mot de passe", error.code);

  return {
    status: "success",
    message:
      "Si un compte correspond à cette adresse, un email avec un lien de réinitialisation vient d’être envoyé. Pensez à vérifier vos courriers indésirables.",
    email,
  };
}

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getPublicSupabaseConfig()) {
    return failure("L’espace apiculteur n’est pas encore configuré.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failure(
      "Le lien a expiré. Recommencez la demande de réinitialisation du mot de passe.",
    );
  }

  const password = formData.get("password");
  const problem = validateNewPassword(password, formData.get("confirmation"));
  if (problem || typeof password !== "string") {
    return failure(problem ?? "Mot de passe invalide.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return failure(authErrorMessage(error));

  redirect("/admin?mot-de-passe=modifie");
}
