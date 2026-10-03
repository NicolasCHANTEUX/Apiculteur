import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["recovery", "invite", "magiclink", "email", "email_change"];

/**
 * Point d'arrivée des liens envoyés par Supabase Auth (réinitialisation du
 * mot de passe, invitation). Deux formats sont acceptés :
 * - `code` : gabarit d'email par défaut (flux PKCE, même navigateur) ;
 * - `token_hash` + `type` : gabarit personnalisé, utilisable depuis un autre
 *   navigateur ou appareil.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = sanitizeRedirectPath(params.get("next"), "/admin");
  const failure = new URL("/connexion?lien=invalide", request.nextUrl.origin);

  if (!getPublicSupabaseConfig()) return NextResponse.redirect(failure);

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(
    ok ? new URL(next, request.nextUrl.origin) : failure,
  );
}
