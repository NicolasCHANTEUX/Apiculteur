import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { FormNotice, NewPasswordForm } from "@/components/auth/auth-forms";
import { passwordChangeAccess } from "@/data/auth";
import { mfaPath } from "@/lib/auth/mfa";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default async function NewPasswordPage() {
  // La session provient du lien reçu par email (/auth/confirm). Avec une
  // application d'authentification associée, le code est demandé d'abord.
  let hasSession = false;
  if (getPublicSupabaseConfig()) {
    const access = await passwordChangeAccess(await createClient());
    if (access === "mfa") redirect(mfaPath("verify", "/nouveau-mot-de-passe"));
    hasSession = access === "allowed";
  }

  return (
    <AuthCard title="Nouveau mot de passe">
      {hasSession ? (
        <NewPasswordForm />
      ) : (
        <div className="space-y-5">
          <FormNotice tone="error">
            Ce lien a expiré ou n’est pas valide. Recommencez la demande de
            réinitialisation.
          </FormNotice>
          <p className="text-center text-[13px]">
            <Link href="/mot-de-passe-oublie" className="text-honey hover:text-honey-dark">
              Recevoir un nouveau lien
            </Link>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
