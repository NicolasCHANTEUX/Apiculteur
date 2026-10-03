import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { FormNotice, LoginForm } from "@/components/auth/auth-forms";
import { getAdminAccess } from "@/data/auth";
import { sanitizeRedirectPath } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/connexion">) {
  const params = await props.searchParams;
  const redirectTo = sanitizeRedirectPath(params.redirect, "/admin");

  // Déjà connecté en administrateur : inutile de repasser par le formulaire.
  const access = await getAdminAccess();
  if (access.status === "admin") redirect(redirectTo);

  return (
    <AuthCard
      title="Connexion"
      subtitle="Accès réservé à l’apiculteur pour gérer le site, les produits et les commandes."
    >
      <div className="space-y-5">
        {params.deconnecte ? (
          <FormNotice tone="info">Vous êtes déconnecté.</FormNotice>
        ) : null}
        {params.lien === "invalide" ? (
          <FormNotice tone="error">
            Ce lien n’est plus valide ou a déjà servi. Demandez un nouvel
            email de réinitialisation, puis ouvrez-le dans ce même navigateur.
          </FormNotice>
        ) : null}
        {access.status === "unconfigured" ? (
          <FormNotice tone="info">
            L’espace apiculteur sera disponible une fois Supabase configuré.
          </FormNotice>
        ) : null}
        <LoginForm redirectTo={redirectTo} />
      </div>
    </AuthCard>
  );
}
