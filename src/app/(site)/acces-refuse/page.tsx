import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(site)/connexion/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { FormNotice } from "@/components/auth/auth-forms";
import { getAdminAccess } from "@/data/auth";

export const metadata: Metadata = {
  title: "Accès refusé",
  robots: { index: false, follow: false },
};

export default async function AccessDeniedPage() {
  const access = await getAdminAccess();
  if (access.status === "admin") redirect("/admin");
  if (access.status === "anonymous") redirect("/connexion");

  return (
    <AuthCard title="Accès refusé">
      {access.status === "unconfigured" ? (
        <FormNotice tone="info">
          L’espace apiculteur nécessite la configuration de Supabase
          (variables d’environnement du fichier .env.example).
        </FormNotice>
      ) : (
        <div className="space-y-5">
          <FormNotice tone="error">
            Le compte {access.email ? <strong>{access.email}</strong> : "connecté"}{" "}
            n’a pas accès à l’espace apiculteur.
          </FormNotice>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-lg border border-line text-[15px] font-medium text-ink transition hover:bg-sand"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </AuthCard>
  );
}
