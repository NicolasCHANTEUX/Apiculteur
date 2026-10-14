import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon } from "@/components/icons";
import { buttonStyles, container } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Merci pour votre avis", robots: { index: false, follow: false } };

export default async function ReviewThanksPage(props: PageProps<"/mon-avis/merci">) {
  const { publication, deja } = await props.searchParams;
  const text =
    deja === "1"
      ? "Votre avis était déjà enregistré : un seul avis est possible par commande."
      : publication === "oui"
        ? "Il sera publié sur le site après relecture. Merci de soutenir un apiculteur passionné !"
        : "Comme vous l’avez choisi, il ne sera pas publié : il reste entre nous.";

  return (
    <main className={`${container} flex-1 pt-14 pb-24`}>
      <div className="mx-auto max-w-[560px] text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/60 motion-safe:animate-[pop_.5s_ease-out]">
          <CircleCheckIcon className="size-10" />
        </span>
        <h1 className="mt-7 font-display text-[32px] leading-tight font-medium text-ink">Merci pour votre avis !</h1>
        <p className="mt-4 text-[14.5px] leading-[1.65] text-muted">{text}</p>
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
