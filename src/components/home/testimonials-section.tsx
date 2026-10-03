import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ReviewCard } from "@/components/reviews/review-card";
import { SectionHeading, Stars, buttonStyles, container } from "@/components/ui";
import type { PublicReview } from "@/data/reviews";
import { formatAverage, summarizeRatings } from "@/lib/domain/ratings";

export function TestimonialsSection({
  reviews,
  productNames,
}: {
  reviews: PublicReview[];
  productNames: Map<string, string>;
}) {
  if (reviews.length === 0) {
    // Rien a afficher tant qu'aucun avis reel n'a ete valide : pas de faux
    // temoignages en production.
    return null;
  }

  const summary = summarizeRatings(reviews.map((review) => review.rating));
  const plural = summary.count > 1 ? "s" : "";

  return (
    <section id="avis" className="bg-sand py-20 sm:py-24">
      <div className={`${container} text-center`}>
        <SectionHeading
          align="center"
          eyebrow="Témoignages"
          title="Ce sont nos clients qui en parlent le mieux"
        />
        <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-muted">
          <Stars rating={summary.average} />
          <span className="text-[15px] font-semibold text-ink">
            {formatAverage(summary.average)}
          </span>
          — {summary.count} avis vérifié{plural}
        </p>

        <div className="mt-10 grid items-start gap-5 md:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              productName={
                review.productId ? productNames.get(review.productId) : undefined
              }
            />
          ))}
        </div>

        <Link href="/avis" className={`${buttonStyles.link} mt-10`}>
          Voir {summary.count > 1 ? `tous les ${summary.count} avis` : "l'avis"}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
