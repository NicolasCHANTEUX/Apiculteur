import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { isPlaceholderValue } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/documents";

/** Paragraphe d'aperçu : texte provisoire surligné (aperçu admin seulement). */
function Text({ value, highlight }: { value: string; highlight: boolean }) {
  return highlight && isPlaceholderValue(value) ? <mark className="rounded bg-orange-100 px-0.5 text-orange-900">{value}</mark> : <>{value}</>;
}

// Rendu commun des pages légales (public) et de leur aperçu (admin).
export function LegalDocumentView({
  document,
  version,
  highlight = false,
}: {
  document: LegalDocument;
  version: string;
  /** Aperçu : valeurs provisoires surlignées. */
  highlight?: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-6 pb-24">
      <PageIntro eyebrow="Informations légales" title={document.title} subtitle={document.intro} />
      <article className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-9">
        <div className="space-y-8">
          {document.sections.map((section) => (
            <section key={section.heading} aria-labelledby={`section-${section.heading}`}>
              <h2 id={`section-${section.heading}`} className="font-display text-[19px] font-semibold text-ink">
                {section.heading}
              </h2>
              <div className="mt-2.5 space-y-2.5 text-[14.5px] leading-[1.75] text-body">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>
                    <Text value={paragraph} highlight={highlight} />
                  </p>
                ))}
                {section.list ? (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {section.list.map((item, index) => (
                      <li key={index}>
                        <Text value={item} highlight={highlight} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.links?.length ? (
                  <p className="flex flex-wrap gap-x-4">
                    {section.links.map((link) =>
                      link.href.startsWith("/") ? (
                        <Link key={link.href} href={link.href} className="font-medium text-honey-dark underline-offset-2 hover:underline">
                          {link.label}
                        </Link>
                      ) : (
                        <a key={link.href} href={link.href} rel="noopener noreferrer" target="_blank" className="font-medium text-honey-dark underline-offset-2 hover:underline">
                          {link.label}
                        </a>
                      ),
                    )}
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-line/70 pt-4 text-[12.5px] text-muted">{version}</p>
      </article>
    </main>
  );
}
