import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/contact-form";
import { RequestForm } from "@/components/contact/request-form";
import {
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
} from "@/components/icons";
import { PageIntro } from "@/components/ui";
import { getPublicProductBySlug } from "@/data/catalog";
import { getRequestFormAvailability } from "@/data/requests";
import { kindFromParams } from "@/lib/requests/form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Une question sur un essaim, une commande ou une livraison ? Écrivez à ${site.owner.firstName}.`,
};

function ContactItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-md bg-honey/15 text-honey">
        {icon}
      </span>
      <div className="text-[13px] leading-[1.5]">
        <p className="font-medium text-ink">{label}</p>
        <div className="text-muted">{children}</div>
      </div>
    </li>
  );
}

function param(value: string | string[] | undefined, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

async function linkedProduct(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  try {
    const result = await getPublicProductBySlug(slug);
    return result.kind === "ready" && result.product ? { slug, name: result.product.name, sku: result.product.sku } : null;
  } catch {
    return null;
  }
}

// Le panier, les fiches produit et la FAQ ouvrent cette page avec un type,
// un produit, un sujet ou un message pré-remplis (?type=devis&produit=…),
// que le visiteur peut modifier. Sans base prête, l'ancien formulaire
// (qui ouvre la messagerie du visiteur) prend le relais.
export default async function ContactPage(props: PageProps<"/contact">) {
  const params = await props.searchParams;
  const prefill = { subject: param(params.sujet, 60), message: param(params.message, 3000) };
  const [availability, product] = await Promise.all([getRequestFormAvailability(), linkedProduct(param(params.produit, 120))]);
  const quantity = param(params.quantite, 5);
  return (
    <main className="mx-auto w-full max-w-[1008px] flex-1 px-6 pb-24">
      <PageIntro
        eyebrow="Contact"
        title="Parlons-nous"
        subtitle="Une question particulière ? N'hésitez pas à m'écrire, je vous répondrai avec plaisir."
      />

      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-[45px]">
        {availability.form ? (
          <RequestForm
            key={`${param(params.type, 20)}|${prefill.subject}|${prefill.message}|${product?.slug ?? ""}`}
            initialKind={kindFromParams(param(params.type, 20), prefill.subject)}
            initialSubject={prefill.subject}
            initialMessage={prefill.message}
            initialQuantity={/^\d{1,5}$/.test(quantity) ? quantity : ""}
            product={product}
            photosEnabled={availability.photos}
          />
        ) : (
          <ContactForm key={`${prefill.subject}|${prefill.message}`} initialSubject={prefill.subject} initialMessage={prefill.message} />
        )}

        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)]">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              Coordonnées
            </h2>
            <ul className="mt-4 space-y-3.5">
              <ContactItem icon={<MailIcon />} label="Email">
                <a href={`mailto:${site.email}`} className="transition hover:text-honey">
                  {site.email}
                </a>
              </ContactItem>
              <ContactItem icon={<PhoneIcon />} label="Téléphone">
                <a href={site.phoneHref} className="transition hover:text-honey">
                  {site.phone}
                </a>
              </ContactItem>
              <ContactItem icon={<MapPinIcon />} label="Localisation">
                <p>{site.region}</p>
                <p>Retrait possible sur exploitation</p>
              </ContactItem>
              <ContactItem icon={<ClockIcon />} label="Disponibilité">
                <p>Réponse généralement sous 24h</p>
                <p>7j/7 pendant la saison</p>
              </ContactItem>
            </ul>
          </section>

          <figure className="rounded-2xl bg-sand p-6">
            <span className="flex size-[37px] items-center justify-center rounded-md bg-honey/15 text-honey">
              <PencilIcon />
            </span>
            <blockquote className="mt-4 text-[13px] leading-[1.65] text-body italic">
              “Je réponds personnellement à chaque message. Si vous avez une
              question spécifique sur votre projet apicole, n&apos;hésitez pas à
              me l&apos;expliquer en détail — j&apos;aime prendre le temps
              d&apos;y répondre sérieusement.”
            </blockquote>
            <figcaption className="mt-4 text-[13px] text-ink">
              — {site.owner.firstName}
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
