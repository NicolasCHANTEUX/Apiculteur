import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { MfaEnrollForm } from "@/components/auth/mfa-forms";
import { getAdminAccess } from "@/data/auth";
import { mfaPath } from "@/lib/auth/mfa";
import { sanitizeRedirectPath } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Double authentification",
  robots: { index: false, follow: false },
};

// Première connexion après l'activation de la double authentification :
// association d'une application, obligatoire pour accéder à l'espace.
export default async function MfaEnrollPage(props: PageProps<"/connexion/double-authentification">) {
  const params = await props.searchParams;
  const target = sanitizeRedirectPath(params.redirect, "/admin");
  const access = await getAdminAccess();
  if (access.status === "admin") redirect(target);
  if (access.status === "anonymous") redirect(`/connexion?redirect=${encodeURIComponent(target)}`);
  if (access.status !== "mfa") redirect("/acces-refuse");
  if (access.mode === "verify") redirect(mfaPath("verify", target));

  return (
    <AuthCard
      title="Double authentification"
      subtitle="Pour protéger les commandes et les données de vos clients, un code à usage unique vous sera demandé à chaque connexion, en plus du mot de passe."
    >
      <MfaEnrollForm target={target} />
    </AuthCard>
  );
}
