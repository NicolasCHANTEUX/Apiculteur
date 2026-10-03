import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordResetRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Indiquez l’email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
    >
      <PasswordResetRequestForm />
    </AuthCard>
  );
}
