import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PageIntro, buttonStyles } from "@/components/ui";
import { getSiteNav } from "@/data/settings";

// 404 globale (URL inconnues) : rendue hors du groupe (site), elle reprend
// donc elle-même l'en-tête et le pied de page publics.
export default async function NotFound() {
  const nav = await getSiteNav();
  return (
    <>
      <SiteHeader nav={nav} />
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
      <SiteFooter nav={nav} />
    </>
  );
}
