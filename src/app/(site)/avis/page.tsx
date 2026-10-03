import type { Metadata } from "next";
import { connection } from "next/server";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { ReviewCard } from "@/components/reviews/review-card";
import { PageIntro, Stars, container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";
import {
  type RatingSummary,
  formatAverage,
  summarizeRatings,
} from "@/lib/domain/ratings";

export const metadata: Metadata = {
  title: "Avis clients",
  description:
    "Les avis de nos clients, tous issus de commandes passées sur ce site.",
};

function RatingOverview({ summary }: { summary: RatingSummary }) {
  return (
    <div className="mx-auto flex max-w-[540px] flex-col items-center gap-6 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:flex-row sm:gap-9">
      <div className="text-center">
        <p className="font-display text-[44px] leading-none font-semibold text-ink">
          {formatAverage(summary.average)}
        </p>
        <Stars rating={summary.average} className="mt-2 text-[14px]" />
        <p className="mt-1 text-[12px] text-muted">
          {summary.count} avis
        </p>
      </div>
      <ul className="w-full flex-1 space-y-2">
        {([5, 4, 3, 2, 1] as const).map((stars) => {
          const count = summary.distribution[stars];
          const percent = summary.count ? (count / summary.count) * 100 : 0;
          return (
            <li
              key={stars}
              className="flex items-center gap-3 text-[12px] text-muted"
            >
              <span className="w-2 text-right">{stars}</span>
              <span className="text-honey" aria-hidden>
                ★
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                <span
                  className="block h-full rounded-full bg-honey"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-4 text-right">{count}</span>
              <span className="sr-only">
                {count} avis à {stars} étoile{stars > 1 ? "s" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function ReviewsPage() {
  await connection();
  const [reviews, catalog] = await Promise.all([
    getPublicReviews(),
    getPublicCatalog(),
  ]);
  const productNames = new Map(
    catalog.kind === "ready"
      ? catalog.products.map((product) => [product.id, product.name])
      : [],
  );

  return (
    <main className={`${container} flex-1 pb-24`}>
      <PageIntro
        eyebrow="Témoignages"
        title="Ils nous font confiance"
        subtitle="Tous les avis proviennent de clients ayant effectué une commande sur ce site. Ils sont vérifiés et non modifiés."
      />

      {reviews.kind === "unconfigured" ? <CatalogUnconfigured /> : null}

      {reviews.kind === "ready" && reviews.reviews.length === 0 ? (
        <section className="mx-auto max-w-[540px] rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">
            Aucun avis publié pour le moment
          </h2>
          <p className="mt-2 text-[14px] text-body">
            Les avis apparaîtront ici dès qu&apos;ils auront été validés.
          </p>
        </section>
      ) : null}

      {reviews.kind === "ready" && reviews.reviews.length > 0 ? (
        <>
          <RatingOverview
            summary={summarizeRatings(
              reviews.reviews.map((review) => review.rating),
            )}
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {reviews.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                variant="full"
                productName={
                  review.productId
                    ? productNames.get(review.productId)
                    : undefined
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
