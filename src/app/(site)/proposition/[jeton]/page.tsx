import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProposalAnswer } from "@/components/order/proposal-answer";
import { formatPrice } from "@/components/catalog/product-display";
import { CircleCheckIcon, ClockIcon, MapPinIcon, MessageCircleIcon, PackageIcon, TruckIcon } from "@/components/icons";
import { PageIntro, buttonStyles } from "@/components/ui";
import { getProposalForToken, type ProposalTerms } from "@/data/order-proposals";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Ma proposition", robots: { index: false, follow: false } };

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

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

function Terms({ title, terms, address, pickupAddress, highlight }: { title: string; terms: ProposalTerms; address?: string | null; pickupAddress?: string | null; highlight?: boolean }) {
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${highlight ? "border-honey/60 bg-white shadow-[0_8px_24px_-16px_rgb(217_154_43/0.7)]" : "border-line bg-cream/50"}`}>
      <h2 className={`text-[12px] font-medium tracking-[0.08em] uppercase ${highlight ? "text-honey-dark" : "text-muted"}`}>{title}</h2>
      <ul className="mt-3 divide-y divide-line/60">
        {terms.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-4 py-2.5 text-[14.5px]">
            <span className="min-w-0 text-ink">
              <span className="font-medium">{line.quantity} ×</span> {line.name}
            </span>
            <span className="shrink-0 text-body tabular-nums">{line.lineTotal > 0 ? formatPrice(line.lineTotal) : "prix à confirmer"}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-line/60 pt-3 text-[14px] text-body">
        <div className="flex items-start gap-2">
          {terms.deliveryMethod === "delivery" ? <TruckIcon className="mt-0.5 size-4 shrink-0 text-honey" /> : <MapPinIcon className="mt-0.5 size-4 shrink-0 text-honey" />}
          <dt className="sr-only">Réception</dt>
          <dd>
            {terms.deliveryMethod === "delivery"
              ? `Livraison${terms.deliveryFee > 0 ? ` : ${formatPrice(terms.deliveryFee)}` : ", frais à convenir"}${address ? ` — ${address}` : ""}`
              : `Retrait sur l’exploitation, gratuit${pickupAddress ? ` — ${pickupAddress}` : ""}`}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-honey" />
          <dt className="sr-only">Date</dt>
          <dd className="first-letter:uppercase">{terms.requestedDate ? day.format(new Date(`${terms.requestedDate}T12:00:00Z`)) : "Date à convenir ensemble"}</dd>
        </div>
      </dl>
      <p className="mt-3 flex justify-between gap-4 border-t border-line/60 pt-3 text-[16px] font-semibold text-ink">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(terms.total)}</span>
      </p>
    </section>
  );
}

// Page de réponse à une proposition de modification, ouverte depuis le lien
// personnel reçu par email (CAHIER §8.2, H6).
export default async function ProposalPage(props: PageProps<"/proposition/[jeton]">) {
  const { jeton } = await props.params;
  const proposal = await getProposalForToken(jeton);
  const firstName = site.owner.firstName;

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pb-24">
      <PageIntro
        eyebrow="Votre demande"
        title={proposal.state === "ok" ? "Ma proposition pour votre demande" : "Votre demande"}
        subtitle={
          proposal.state === "ok"
            ? `Bonjour${proposal.customerName ? ` ${proposal.customerName.split(" ")[0]}` : ""} ! Je ne peux pas répondre à votre demande tout à fait telle quelle : voici ce que je vous propose.`
            : undefined
        }
      />

      {proposal.state === "invalid" ? (
        <Message icon={<PackageIcon className="size-6" />} title="Ce lien n’est pas valide">
          Vérifiez qu’il est complet (copiez-le entièrement depuis l’email), ou écrivez-moi : je reviendrai vers vous.
        </Message>
      ) : proposal.state === "expired" ? (
        <Message icon={<ClockIcon className="size-6" />} title="Ce lien a expiré">
          Les disponibilités ont pu changer depuis. Écrivez-moi : je vous fais une nouvelle proposition.
        </Message>
      ) : proposal.state === "withdrawn" ? (
        <Message icon={<PackageIcon className="size-6" />} title="Cette proposition n’est plus d’actualité">
          Je l’ai remplacée ou retirée entre-temps. Vérifiez vos emails, ou écrivez-moi pour faire le point.
        </Message>
      ) : proposal.state === "answered" ? (
        <Message icon={<CircleCheckIcon className="size-6" />} title="Votre réponse est déjà enregistrée">
          {proposal.accepted ? "Vous avez accepté cette proposition : merci !" : "Vous avez décliné cette proposition."} Pour changer d’avis, écrivez-moi simplement.
        </Message>
      ) : (
        <div className="space-y-6">
          {proposal.message ? (
            <blockquote className="rounded-2xl border-l-4 border-honey bg-cream/70 px-5 py-4 text-[15px] leading-[1.65] whitespace-pre-line text-ink">
              {proposal.message}
              <footer className="mt-2 text-[13px] text-muted">— {firstName}</footer>
            </blockquote>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Terms title="Votre demande" terms={proposal.previous} address={proposal.address} pickupAddress={proposal.pickupAddress} />
            <Terms title="Ma proposition" terms={proposal.proposed} address={proposal.address} pickupAddress={proposal.pickupAddress} highlight />
          </div>
          <p className="rounded-xl bg-sand/70 px-4 py-3 text-[13.5px] text-body">
            Demande <span className="font-medium text-ink">{proposal.orderNumber}</span> du {longDate.format(new Date(proposal.orderDate))}. Proposition valable jusqu’au{" "}
            {longDate.format(new Date(proposal.expiresAt))}.
          </p>
          <ProposalAnswer token={jeton} ownerFirstName={firstName} />
        </div>
      )}
    </main>
  );
}
