import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon, PhoneIcon } from "@/components/icons";
import { buttonStyles, container } from "@/components/ui";
import { getEmailConfig } from "@/data/email";
import { kindFromParams } from "@/lib/requests/form";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Message envoyé", robots: { index: false, follow: false } };

const titles = {
  contact: "Merci, votre message est envoyé",
  quote: "Merci, votre demande de devis est envoyée",
  swarm: "Merci pour votre signalement",
} as const;

// Accusé de réception à l'écran (CAHIER §12.1) après une demande.
export default async function RequestThanksPage(props: PageProps<"/contact/merci">) {
  const { ref, type } = await props.searchParams;
  const reference = typeof ref === "string" && /^DEM-\d{1,10}$/.test(ref) ? ref : null;
  const kind = kindFromParams(typeof type === "string" ? type : "", "");
  const emailed = Boolean(getEmailConfig().provider);

  return (
    <main className={`${container} flex-1 pt-14 pb-24`}>
      <div className="mx-auto max-w-[620px] text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/60 motion-safe:animate-[pop_.5s_ease-out]">
          <CircleCheckIcon className="size-10" />
        </span>
        <h1 className="mt-7 font-display text-[32px] leading-tight font-medium text-ink">{titles[kind]}</h1>
        {reference ? (
          <p className="mt-4 text-[15px] text-body">
            Référence :{" "}
            <span className="rounded-lg bg-honey/12 px-2.5 py-1 font-semibold tracking-[0.02em] text-honey-dark">{reference}</span>
          </p>
        ) : null}
        <p className="mt-4 text-[14.5px] leading-[1.65] text-muted">
          {kind === "swarm"
            ? "Je regarde au plus vite si je peux venir le récupérer et je vous appelle. En attendant, gardez vos distances : un essaim posé est en général calme."
            : `Je vous réponds personnellement, en général sous 24 heures (un peu plus en pleine saison).`}{" "}
          {emailed ? "Une copie de votre message vient de vous être envoyée par email." : null}
        </p>

        {kind === "swarm" ? (
          <p className="mx-auto mt-6 flex max-w-[420px] items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[14px] text-body">
            <PhoneIcon className="size-4 text-honey" />
            Urgent ? Appelez-moi au{" "}
            <a href={site.phoneHref} className="font-semibold text-honey-dark hover:underline">
              {site.phone}
            </a>
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/catalogue" className={buttonStyles.primary}>
            Voir les essaims
            <ArrowRightIcon className="size-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-white px-5 text-[14px] font-medium text-ink transition hover:border-honey/50"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
