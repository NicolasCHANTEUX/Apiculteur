import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "@/components/order/clear-cart";
import { ArrowRightIcon, CircleCheckIcon, MessageCircleIcon } from "@/components/icons";
import { buttonStyles, container } from "@/components/ui";
import { getEmailConfig } from "@/data/email";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Demande envoyée", robots: { index: false, follow: false } };

const steps = [
  { title: "J’étudie votre demande", text: "Disponibilités, quantités et organisation du retrait ou de la livraison." },
  { title: "Je vous recontacte", text: "Par téléphone ou par email, pour confirmer avec vous chaque détail." },
  { title: "Nous convenons du retrait ou de la livraison", text: "Le paiement se fait selon les modalités confirmées ensemble." },
];

export default async function OrderThanksPage(props: PageProps<"/commande/merci">) {
  const { numero } = await props.searchParams;
  const number = typeof numero === "string" && /^CMD-\d{1,10}$/.test(numero) ? numero : null;
  const emailed = Boolean(getEmailConfig().provider);

  return (
    <main className={`${container} flex-1 pt-14 pb-24`}>
      <ClearCart />
      <div className="mx-auto max-w-[640px] text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/60 motion-safe:animate-[pop_.5s_ease-out]">
          <CircleCheckIcon className="size-10" />
        </span>
        <h1 className="mt-7 font-display text-[34px] leading-tight font-medium text-ink">Merci, votre demande est envoyée</h1>
        {number ? (
          <p className="mt-4 text-[15px] text-body">
            Numéro de demande :{" "}
            <span className="rounded-lg bg-honey/12 px-2.5 py-1 font-semibold tracking-[0.02em] text-honey-dark">{number}</span>
          </p>
        ) : null}
        <p className="mt-4 text-[14.5px] leading-[1.65] text-muted">
          {emailed
            ? "Un récapitulatif vient de vous être envoyé par email (pensez à regarder dans les indésirables). "
            : "Notez ce numéro : il vous sera utile si vous m’écrivez au sujet de cette demande. "}
          Aucun paiement ne vous est demandé à cette étape.
        </p>
      </div>

      <ol className="mx-auto mt-12 grid max-w-[880px] gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.05)]">
            <span className="flex size-8 items-center justify-center rounded-full bg-honey text-[14px] font-semibold text-white">
              {index + 1}
            </span>
            <p className="mt-4 font-display text-[17px] font-semibold text-ink">{step.title}</p>
            <p className="mt-1 text-[13.5px] leading-[1.55] text-muted">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link href="/catalogue" className={buttonStyles.primary}>
          Retour au catalogue
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-white px-5 text-[14px] font-medium text-ink transition hover:border-honey/50"
        >
          <MessageCircleIcon className="size-4 text-honey" />
          Écrire à {site.owner.firstName}
        </Link>
      </div>
    </main>
  );
}
