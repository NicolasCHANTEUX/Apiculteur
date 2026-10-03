import type { Metadata } from "next";
import { connection } from "next/server";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";
import { averageByProduct } from "@/lib/domain/ratings";

export const metadata: Metadata = {
  title: "Nos essaims",
  description:
    "Essaims et reines élevés sur notre exploitation normande : disponibilités et tarifs.",
};

export default async function CatalogPage() {
  // La configuration Supabase peut etre fournie au demarrage du serveur et
  // ne doit pas etre figee au moment du build.
  await connection();
  const [catalog, reviews] = await Promise.all([
    getPublicCatalog(),
    getPublicReviews(),
  ]);
  const ratings =
    reviews.kind === "ready"
      ? Object.fromEntries(averageByProduct(reviews.reviews))
      : {};

  return (
    <main className="flex-1">
      <CatalogHeader />

      <div className={`${container} pt-10 pb-24`}>
        {catalog.kind === "unconfigured" ? <CatalogUnconfigured /> : null}

        {catalog.kind === "ready" && catalog.products.length === 0 ? (
          <section className="rounded-xl border border-line bg-white p-8">
            <h2 className="font-display text-xl font-semibold text-ink">
              Aucun essaim publié pour le moment
            </h2>
            <p className="mt-2 text-[14px] text-body">
              Revenez prochainement pour découvrir les nouvelles disponibilités.
            </p>
          </section>
        ) : null}

        {catalog.kind === "ready" && catalog.products.length > 0 ? (
          <CatalogBrowser products={catalog.products} ratings={ratings} />
        ) : null}
      </div>
    </main>
  );
}
