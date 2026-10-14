import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, Panel, panelClass } from "@/components/admin/admin-ui";
import { LinkPending } from "@/components/admin/link-pending";
import { ReviewDelaySelect, ReviewModeration, SendDueRequestsButton } from "@/components/admin/reviews/review-controls";
import { ReviewsSwitch } from "@/components/admin/reviews/reviews-switch";
import { StarIcon } from "@/components/icons";
import { Stars } from "@/components/ui";
import { isReviewTab, listAdminReviews, reviewTabs, reviewsInTab, type ReviewTab } from "@/data/admin/reviews";
import { requireAdmin } from "@/data/auth";
import { getReviewSettings, getSiteSettings } from "@/data/settings";
import { reviewStatusLabels, type ReviewStatus } from "@/lib/reviews/form";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Avis" };

const statusStyles: Record<ReviewStatus, string> = {
  pending: "bg-honey/15 text-honey-dark ring-honey/30",
  displayed: "bg-green-50 text-green-800 ring-green-200",
  hidden: "bg-sand text-muted ring-line",
  refused: "bg-red-50 text-red-800 ring-red-200",
};

const average = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function AdminReviewsPage(props: PageProps<"/admin/avis">) {
  await requireAdmin("/admin/avis");
  const params = await props.searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const [data, { reviewsPublic }, { delayDays }] = await Promise.all([listAdminReviews(), getSiteSettings(), getReviewSettings()]);
  // Par défaut : les avis à modérer, ou tous s'il n'y en a aucun.
  const tab: ReviewTab = isReviewTab(statut) ? statut : data.pending ? "a-moderer" : "tous";
  const reviews = reviewsInTab(data.reviews, tab);
  const { invitations } = data;

  return (
    <main className="space-y-6">
      <PageHeader
        title="Avis"
        description="Les avis laissés par vos clients après leur commande : relisez-les, publiez-les, répondez-y."
        actions={<ReviewsSwitch visible={reviewsPublic} published={data.published} />}
      />

      {reviewsPublic ? (
        data.published === 0 ? (
          <Notice tone="warning">
            Les avis sont affichés, mais aucun n’est encore publié : la page « Avis clients » du site est vide. Vous pouvez les masquer en
            attendant les premiers avis.
          </Notice>
        ) : null
      ) : (
        <Notice tone="info">
          Les avis sont masqués sur le site : ni la page « Avis clients », ni son lien, ni les notes des produits n’apparaissent. Vous
          pouvez tout de même collecter et modérer les avis ; activez l’interrupteur quand vous voulez les montrer.
        </Notice>
      )}

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Avis publiés", value: String(data.published), detail: "Validés, avec l’accord du client" },
          { label: "Note moyenne", value: data.average === null ? "—" : `${average.format(data.average)} / 5`, detail: "Sur les avis publiés" },
          { label: "À modérer", value: String(data.pending), detail: data.pending ? "En attente de votre relecture" : "Rien en attente" },
        ].map((card) => (
          <div key={card.label} className={`${panelClass} px-5 py-4`}>
            <dt className="text-[12px] tracking-[0.06em] text-muted uppercase">{card.label}</dt>
            <dd className="mt-1 font-display text-[28px] leading-none font-semibold text-ink tabular-nums">{card.value}</dd>
            <dd className="mt-1.5 text-[12.5px] text-muted">{card.detail}</dd>
          </div>
        ))}
      </dl>

      <Panel
        title="Demandes d’avis"
        description="Un email avec un lien personnel (valable 30 jours) est envoyé au client après le retrait ou la livraison."
      >
        {invitations.available ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ReviewDelaySelect value={delayDays} />
              <SendDueRequestsButton due={invitations.due} />
            </div>
            <ul className="grid gap-2 text-[13px] sm:grid-cols-3">
              {[
                { label: "Programmées", value: invitations.scheduled, detail: invitations.due ? `dont ${invitations.due} à envoyer maintenant` : "partiront à leur date" },
                { label: "Envoyées, en attente", value: invitations.waiting, detail: "lien encore valable" },
                { label: "Avis reçus par lien", value: invitations.received, detail: "depuis les demandes" },
              ].map((item) => (
                <li key={item.label} className="rounded-xl bg-cream/70 px-3.5 py-2.5">
                  <span className="font-semibold text-ink tabular-nums">{item.value}</span> <span className="text-body">{item.label.toLowerCase()}</span>
                  <span className="block text-[12px] text-muted">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[13.5px] text-body">
            Appliquez la migration <code className="rounded bg-sand px-1">20261016100000_review_requests.sql</code> dans l’éditeur SQL de Supabase pour
            envoyer des demandes d’avis.
          </p>
        )}
      </Panel>

      <section className={panelClass} aria-label="Avis reçus">
        <nav aria-label="Filtrer par état" className="overflow-x-auto border-b border-line/60">
          <ul className="flex min-w-max gap-1 px-3 pt-2 sm:px-4">
            {(Object.keys(reviewTabs) as ReviewTab[]).map((value) => {
              const current = value === tab;
              return (
                <li key={value}>
                  <Link
                    href={`/admin/avis?statut=${value}`}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-2 px-3 text-[13.5px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                      current ? "text-ink after:bg-honey" : "text-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    {reviewTabs[value]}
                    <span
                      className={`rounded-full px-1.5 py-px text-[11.5px] tabular-nums ${
                        value === "a-moderer" && data.counts[value] > 0 ? "bg-honey text-white" : current ? "bg-honey/15 text-honey-dark" : "bg-sand text-muted"
                      }`}
                    >
                      {data.counts[value]}
                    </span>
                    <LinkPending className="-ml-1 text-honey" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {reviews.length === 0 ? (
          <EmptyState icon={<StarIcon className="size-5" />} title={tab === "a-moderer" ? "Aucun avis à modérer" : "Aucun avis ici"}>
            {tab === "a-moderer" ? "Les avis déposés par vos clients arriveront ici pour relecture." : "Changez d’onglet pour voir les autres avis."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {reviews.map((review) => (
              <li key={review.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-medium text-ink">{review.customerName}</span>
                      <Stars rating={review.rating} className="text-[12px]" />
                      <span className="text-[12.5px] text-muted">
                        {formatOrderDate(review.submittedAt ?? review.createdAt)}
                        {review.productName ? (
                          <>
                            {" · "}
                            {review.productId ? (
                              <Link href={`/admin/produits/${review.productId}`} className="hover:text-honey-dark hover:underline">
                                {review.productName}
                              </Link>
                            ) : (
                              review.productName
                            )}
                          </>
                        ) : null}
                        {review.order ? (
                          <>
                            {" · "}
                            <Link href={`/admin/commandes/${review.order.id}`} className="hover:text-honey-dark hover:underline">
                              {review.order.number}
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </p>
                    {review.comment ? (
                      <p className="mt-1.5 text-[14px] leading-[1.6] whitespace-pre-line text-body">{review.comment}</p>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-muted italic">Note seule, sans commentaire.</p>
                    )}
                    {review.adminReply ? (
                      <p className="mt-2 border-l-2 border-honey/40 pl-3 text-[13px] text-muted">
                        <span className="font-medium text-body">Votre réponse :</span> {review.adminReply}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {review.featured ? <span className="rounded-md bg-honey/12 px-1.5 py-0.5 text-[11.5px] font-medium text-honey-dark">Mis en avant</span> : null}
                    {!review.consent ? <span className="rounded-md bg-sand px-1.5 py-0.5 text-[11.5px] font-medium text-brown">Privé (sans accord de publication)</span> : null}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ring-inset ${statusStyles[review.status]}`}>
                      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                      {reviewStatusLabels[review.status]}
                    </span>
                  </div>
                </div>
                <ReviewModeration
                  key={`${review.status}|${review.featured}|${review.adminReply ?? ""}|${review.customerName}`}
                  review={{
                    id: review.id,
                    status: review.status,
                    featured: review.featured,
                    consent: review.consent,
                    customerName: review.customerName,
                    adminReply: review.adminReply,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
