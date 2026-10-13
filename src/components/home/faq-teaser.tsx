import Link from "next/link";
import { ArrowRightIcon, ChevronDownIcon } from "@/components/icons";
import { SectionHeading, buttonStyles, container } from "@/components/ui";
import { faq, faqThemes, type FaqTheme } from "@/lib/faq";

// Aperçu de la FAQ sur l'accueil : la première question de chaque thème.
const highlights = (Object.keys(faqThemes) as FaqTheme[])
  .map((theme) => faq.find((item) => item.theme === theme))
  .filter((item) => item !== undefined);

export function FaqTeaser({ tone }: { tone: "cream" | "sand" }) {
  return (
    <section className={`${tone === "sand" ? "bg-sand" : "bg-cream"} py-20 sm:py-24`}>
      <div className={`${container} grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-14`}>
        <div className="md:sticky md:top-[calc(var(--header-height)+2rem)] md:self-start">
          <SectionHeading
            eyebrow="Questions fréquentes"
            title="Vos questions, mes réponses"
            subtitle="Réservation, livraison, paiement : l’essentiel avant de vous lancer."
          />
          <Link href="/faq" className={`${buttonStyles.link} mt-6`}>
            Toutes les questions
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {highlights.map((item) => (
            <details
              key={item.id}
              className="faq-item reveal group rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgb(61_43_26/0.06)] transition-[border-color,box-shadow] open:border-honey/40 open:shadow-[0_14px_32px_-22px_rgb(61_43_26/0.45)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-4 text-[15px] leading-[1.4] text-ink outline-none focus-visible:ring-2 focus-visible:ring-honey/40">
                {item.question}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-honey/10 text-honey transition duration-300 group-open:rotate-180 group-open:bg-honey group-open:text-white">
                  <ChevronDownIcon className="size-4" />
                </span>
              </summary>
              <div className="px-6 pb-5">
                <p className="text-[14px] leading-[1.7] text-body">{item.answer}</p>
                <Link
                  href={`/faq#${item.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-honey transition hover:text-honey-dark"
                >
                  {faqThemes[item.theme]} : toutes les questions
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
