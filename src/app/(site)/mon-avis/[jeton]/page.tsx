import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReviewForm } from "@/components/reviews/review-form";
import { CircleCheckIcon, ClockIcon, MessageCircleIcon, StarIcon } from "@/components/icons";
import { PageIntro, buttonStyles } from "@/components/ui";
import { getPublishedLegal } from "@/data/legal";
import { getInvitationForToken } from "@/data/review-invitations";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Votre avis", robots: { index: false, follow: false } };

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function Message({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-[560px] rounded-2xl border border-line bg-white px-6 py-10 text-center shadow-[0_1px_3px_rgb(61_43_26/0.06)]">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-honey/12 text-honey">{icon}</span>
      <h2 className="mt-5 font-display text-[24px] font-medium text-ink">{title}</h2>
      <div className="mt-2 text-[14.5px] leading-[1.65] text-body">{children}</div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/contact" className={buttonStyles.primary}>
          <MessageCircleIcon className="size-4" />
          Écrire à {site.owner.firstName}
        </Link>
      </div>
    </section>
  );
}

// Page de dépôt d'avis, ouverte depuis le lien personnel reçu par email
// (CAHIER §13). Fonctionne même quand les avis ne sont pas encore affichés
// sur le site : l'apiculteur peut collecter les avis avant de les montrer.
export default async function ReviewDepositPage(props: PageProps<"/mon-avis/[jeton]">) {
  const { jeton } = await props.params;
  const [invitation, legal] = await Promise.all([getInvitationForToken(jeton), getPublishedLegal()]);

  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-6 pb-24">
      <PageIntro
        eyebrow="Votre avis"
        title={invitation.state === "ok" ? "Comment s’est passée votre commande ?" : "Votre avis"}
        subtitle={
          invitation.state === "ok"
            ? `Merci de prendre deux minutes, ${invitation.customerName.split(" ")[0] || "c’est précieux"} : votre retour m’aide à progresser et guide d’autres apiculteurs.`
            : undefined
        }
      />

      {invitation.state === "invalid" ? (
        <Message icon={<StarIcon className="size-6" />} title="Ce lien n’est pas valide">
          Vérifiez qu’il est complet (copiez-le entièrement depuis l’email), ou écrivez-moi : je vous en enverrai un nouveau.
        </Message>
      ) : invitation.state === "expired" ? (
        <Message icon={<ClockIcon className="size-6" />} title="Ce lien a expiré">
          Les liens restent valables 30 jours. Votre avis m’intéresse toujours : écrivez-moi et je vous en enverrai un nouveau.
        </Message>
      ) : invitation.state === "used" ? (
        <Message icon={<CircleCheckIcon className="size-6" />} title="Votre avis est déjà enregistré">
          Merci encore ! Un seul avis est possible par commande. Pour le modifier, écrivez-moi simplement.
        </Message>
      ) : (
        <div className="space-y-5">
          <p className="rounded-xl bg-sand/70 px-4 py-3 text-[13.5px] text-body">
            Commande <span className="font-medium text-ink">{invitation.orderNumber}</span> du {longDate.format(new Date(invitation.orderDate))} :{" "}
            {invitation.products.map((product) => `${product.quantity} × ${product.name}`).join(", ")}
          </p>
          <ReviewForm token={jeton} suggestedName={invitation.suggestedName} privacyPublished={Boolean(legal)} />
          <p className="text-center text-[12.5px] text-muted">
            Lien personnel valable jusqu’au {longDate.format(new Date(invitation.expiresAt))}. Un seul avis par commande.
          </p>
        </div>
      )}
    </main>
  );
}
