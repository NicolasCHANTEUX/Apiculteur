import type { Metadata } from "next";
import Link from "next/link";
import { FaqBrowser } from "@/components/faq/faq-browser";
import { MailIcon, MessageCircleIcon, PhoneIcon } from "@/components/icons";
import { OwnerAvatar, PageIntro, buttonStyles, container } from "@/components/ui";
import { getSiteSettings } from "@/data/settings";
import { faq } from "@/lib/faq";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Réservation, disponibilités, livraison, paiement, factures et avis : les réponses aux questions fréquentes.",
};

// Données structurées « FAQPage » (schema.org) : mêmes questions et réponses
// que la page. Le « < » est échappé pour ne jamais fermer la balise script.
const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
}).replace(/</g, "\\u003c");

export default async function FaqPage() {
  // Sans avis affichés sur le site, pas de lien vers leur page.
  const { reviewsPublic } = await getSiteSettings();
  const items = reviewsPublic ? faq : faq.map((item) => (item.link?.href === "/avis" ? { ...item, link: undefined } : item));
  return (
    <main className={`${container} flex-1 pb-24`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <PageIntro
        eyebrow="Questions fréquentes"
        title="FAQ"
        subtitle="Si vous ne trouvez pas la réponse, n'hésitez pas à me contacter directement."
      />

      <FaqBrowser items={items} />

      <section className="reveal relative mt-16 overflow-hidden rounded-3xl bg-brown px-6 py-10 sm:px-10">
        <div className="absolute -top-20 -right-16 size-64 rounded-full bg-honey/20 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 className="font-display text-[28px] leading-[1.2] font-medium text-white">
              Vous n’avez pas trouvé votre réponse ?
            </h2>
            <p className="mt-3 max-w-[480px] text-[14px] leading-[1.65] text-parchment">
              Chaque projet est différent : décrivez-moi le vôtre, je vous réponds personnellement.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonStyles.primary}>
                Poser ma question
                <MessageCircleIcon className="size-4" />
              </Link>
              <a href={site.phoneHref} className={buttonStyles.ghostOnDark}>
                <PhoneIcon className="size-4" />
                {site.phone}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <OwnerAvatar className="size-12 text-[18px]" />
            <div className="text-[13px]">
              <p className="font-semibold text-white">{site.owner.fullName}</p>
              <a href={`mailto:${site.email}`} className="mt-0.5 flex items-center gap-1.5 text-parchment transition hover:text-white">
                <MailIcon className="size-3.5" />
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
