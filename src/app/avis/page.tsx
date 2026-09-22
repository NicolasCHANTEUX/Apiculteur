import type { Metadata } from "next";
import { connection } from "next/server";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { ReviewCard } from "@/components/home/testimonials-section";
import { getPublicReviews } from "@/data/reviews";

export const metadata: Metadata = {
  title: "Avis clients",
  description: "Les avis vérifiés de nos clients.",
};

export default async function AvisPage() {
  await connection();
  const result = await getPublicReviews();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-semibold tracking-widest text-accent-dark uppercase">
          Avis clients
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Ce que disent nos clients
        </h1>
      </header>

      {result.kind === "unconfigured" ? <CatalogUnconfigured /> : null}

      {result.kind === "ready" && result.reviews.length === 0 ? (
        <section className="rounded-2xl border border-black/10 bg-white p-8">
          <h2 className="text-xl font-semibold text-ink">
            Aucun avis publié pour le moment
          </h2>
          <p className="mt-2 text-ink-muted">
            Les avis apparaîtront ici dès qu&apos;ils auront été validés par
            l&apos;apiculteur.
          </p>
        </section>
      ) : null}

      {result.kind === "ready" && result.reviews.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
