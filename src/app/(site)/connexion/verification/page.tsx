import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { MfaVerifyForm } from "@/components/auth/mfa-forms";
import { getAdminAccess } from "@/data/auth";
import { mfaPath } from "@/lib/auth/mfa";
import { sanitizeRedirectPath } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Code de vérification",
  robots: { index: false, follow: false },
};

// Deuxième étape de la connexion : code de l'application d'authentification.
export default async function MfaVerifyPage(props: PageProps<"/connexion/verification">) {
  const params = await props.searchParams;
  const target = sanitizeRedirectPath(params.redirect, "/admin");
  const access = await getAdminAccess();
  if (access.status === "admin") redirect(target);
  if (access.status === "anonymous") redirect(`/connexion?redirect=${encodeURIComponent(target)}`);
  if (access.status !== "mfa") redirect("/acces-refuse");
  if (access.mode === "enroll") redirect(mfaPath("enroll", target));

  return (
    <AuthCard title="Code de vérification" subtitle="Ouvrez votre application d’authentification et saisissez le code affiché pour l’espace apiculteur.">
      <MfaVerifyForm target={target} />
    </AuthCard>
  );
}
