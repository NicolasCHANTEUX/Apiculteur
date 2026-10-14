import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, panelClass } from "@/components/admin/admin-ui";
import { ReviewsSwitch } from "@/components/admin/reviews/reviews-switch";
import { StarIcon } from "@/components/icons";
import { Stars } from "@/components/ui";
import { listAdminReviews, reviewStatusLabels, type ReviewStatus } from "@/data/admin/reviews";
import { requireAdmin } from "@/data/auth";
import { getSiteSettings } from "@/data/settings";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Avis" };

const statusStyles: Record<ReviewStatus, string> = {
  pending: "bg-honey/15 text-honey-dark ring-honey/30",
  displayed: "bg-green-50 text-green-800 ring-green-200",
  hidden: "bg-sand text-muted ring-line",
  refused: "bg-red-50 text-red-800 ring-red-200",
};

const average = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function AdminReviewsPage() {
  await requireAdmin("/admin/avis");
  const [{ reviews, published, pending, average: mean }, { reviewsPublic }] = await Promise.all([listAdminReviews(), getSiteSettings()]);

  return (
    <main className="space-y-6">
      <PageHeader
        title="Avis"
        description="Les avis laissés par vos clients après leur commande, et leur affichage sur le site."
        actions={<ReviewsSwitch visible={reviewsPublic} published={published} />}
      />

      {reviewsPublic ? (
        published === 0 ? (
          <Notice tone="warning">
            Les avis sont affichés, mais aucun n’est encore publié : la page « Avis clients » du site est vide. Vous pouvez les masquer en
            attendant les premiers avis.
          </Notice>
        ) : null
      ) : (
        <Notice tone="info">
          Les avis sont masqués : ni la page « Avis clients », ni son lien dans le menu, ni les notes des produits n’apparaissent sur le site.
          Activez l’interrupteur quand vous aurez de vrais avis à montrer.
        </Notice>
      )}

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Avis publiés", value: String(published), detail: "Validés, avec l’accord du client" },
          { label: "Note moyenne", value: mean === null ? "—" : `${average.format(mean)} / 5`, detail: "Sur les avis publiés" },
          { label: "En attente", value: String(pending), detail: "À modérer" },
        ].map((card) => (
          <div key={card.label} className={`${panelClass} px-5 py-4`}>
            <dt className="text-[12px] tracking-[0.06em] text-muted uppercase">{card.label}</dt>
            <dd className="mt-1 font-display text-[28px] leading-none font-semibold text-ink tabular-nums">{card.value}</dd>
            <dd className="mt-1.5 text-[12.5px] text-muted">{card.detail}</dd>
          </div>
        ))}
      </dl>

      <section className={panelClass} aria-label="Avis reçus">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 px-5 py-4">
          <h2 className="font-display text-[17px] font-semibold text-ink">Avis reçus</h2>
          <p className="text-[12.5px] text-muted">La modération (accepter, masquer, répondre) arrive avec le lot 8.</p>
        </div>
        {reviews.length === 0 ? (
          <EmptyState icon={<StarIcon className="size-5" />} title="Aucun avis pour le moment">
            Après une commande, vos clients pourront laisser un avis par un lien personnel (lot 8).
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-[1_1_320px]">
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
                    </span>
                  </p>
                  {review.comment ? <p className="mt-1 text-[14px] leading-[1.6] text-body">{review.comment}</p> : null}
                  {review.adminReply ? (
                    <p className="mt-1.5 border-l-2 border-honey/40 pl-3 text-[13px] text-muted">Votre réponse : {review.adminReply}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {review.featured ? <span className="rounded-md bg-honey/12 px-1.5 py-0.5 text-[11.5px] font-medium text-honey-dark">Mis en avant</span> : null}
                  {!review.consent ? <span className="rounded-md bg-sand px-1.5 py-0.5 text-[11.5px] font-medium text-brown">Sans accord d’affichage</span> : null}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ring-inset ${statusStyles[review.status]}`}>
                    <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                    {reviewStatusLabels[review.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
