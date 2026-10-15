import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon } from "@/components/icons";
import { buttonStyles, container } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Réponse enregistrée", robots: { index: false, follow: false } };

const texts: Record<string, { title: string; text: string }> = {
  acceptee: {
    title: "Merci, c’est confirmé !",
    text: "Votre commande est confirmée selon ma proposition. Vous recevez un email de confirmation, et je reviens vers vous pour le retrait ou la livraison.",
  },
  "a-confirmer": {
    title: "Merci pour votre accord !",
    text: "Votre réponse est bien enregistrée. Je vérifie une dernière fois les disponibilités et je vous confirme la commande au plus vite.",
  },
  declinee: {
    title: "Réponse bien reçue",
    text: "Votre demande reste à l’étude : je reviens vers vous pour trouver une autre solution, si c’est possible.",
  },
};

export default async function ProposalThanksPage(props: PageProps<"/proposition/merci">) {
  const { reponse } = await props.searchParams;
  const content = texts[typeof reponse === "string" ? reponse : ""] ?? texts.acceptee;

  return (
    <main className={`${container} flex-1 pt-14 pb-24`}>
      <div className="mx-auto max-w-[560px] text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/60 motion-safe:animate-[pop_.5s_ease-out]">
          <CircleCheckIcon className="size-10" />
        </span>
        <h1 className="mt-7 font-display text-[32px] leading-tight font-medium text-ink">{content.title}</h1>
        <p className="mt-4 text-[14.5px] leading-[1.65] text-muted">{content.text}</p>
        <p className="mt-2 text-[14.5px] text-body">— {site.owner.firstName}</p>
        <div className="mt-10 flex justify-center">
          <Link href="/catalogue" className={buttonStyles.primary}>
            Voir les essaims
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
