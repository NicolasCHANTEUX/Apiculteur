import Link from "next/link";
import type { PublicReview } from "@/data/reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill={i < rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1"
          className="size-4"
          aria-hidden
        >
          <path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.27l-4.78 2.43.91-5.32-3.86-3.76 5.34-.78L10 2Z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: PublicReview }) {
  const initial = review.customerName.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="rounded-2xl bg-white p-6 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-tan font-display text-sm font-semibold text-ink">
            {initial}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {review.customerName}
            </p>
            {review.submittedAt ? (
              <p className="text-xs text-ink-muted">
                {new Date(review.submittedAt).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Vérifié
        </span>
      </div>

      <div className="mt-4">
        <Stars rating={review.rating} />
      </div>

      {review.comment ? (
        <p className="mt-3 leading-6 text-ink-muted">« {review.comment} »</p>
      ) : null}

      {review.adminReply ? (
        <div className="mt-4 rounded-xl bg-cream p-3">
          <p className="text-xs font-semibold text-ink">Réponse de Marc</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            « {review.adminReply} »
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function TestimonialsSection({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) {
    // Rien a afficher tant qu'aucun avis reel n'a ete valide : on evite de
    // simuler des temoignages, contrairement au contenu d'exemple de la
    // maquette Figma.
    return null;
  }

  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <section id="avis" className="bg-tan">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8">
        <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
          Témoignages
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Ce sont nos clients qui en parlent le mieux
        </h2>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <Stars rating={Math.round(average)} />
          {average.toFixed(1)} — {reviews.length} avis vérifié
          {reviews.length > 1 ? "s" : ""}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        <Link
          href="/avis"
          className="mt-10 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark hover:text-accent"
        >
          Voir tous les avis →
        </Link>
      </div>
    </section>
  );
}
