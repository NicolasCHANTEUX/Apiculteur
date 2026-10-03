import Link from "next/link";
import { PageIntro, buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[768px] flex-1 px-6 pb-24 text-center">
      <PageIntro
        eyebrow="Erreur 404"
        title="Cette page n'existe pas"
        subtitle="Elle a peut-être été déplacée, ou l'adresse contient une erreur."
      />
      <Link href="/" className={buttonStyles.primary}>
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
