import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { FormNotice, NewPasswordForm } from "@/components/auth/auth-forms";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default async function NewPasswordPage() {
  // La session provient du lien reçu par email (/auth/confirm).
  let hasSession = false;
  if (getPublicSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasSession = Boolean(user);
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
