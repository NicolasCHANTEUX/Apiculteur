import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CatalogFilters, CatalogPagination, CatalogSummary } from "@/components/catalog/catalog-filters";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { ProductCard } from "@/components/catalog/product-card";
import { SearchIcon } from "@/components/icons";
import { container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";
import { browseCatalog, readCriteria } from "@/lib/catalog/browse";
import { averageByProduct } from "@/lib/domain/ratings";

export const metadata: Metadata = {
  title: "Nos essaims",
  description:
    "Essaims et reines élevés sur notre exploitation normande : disponibilités et tarifs.",
};

export default async function CatalogPage(props: PageProps<"/catalogue">) {
  // La configuration Supabase peut etre fournie au demarrage du serveur et
  // ne doit pas etre figee au moment du build.
  await connection();
  const params = await props.searchParams;
  const criteria = readCriteria({ get: (name) => (typeof params[name] === "string" ? (params[name] as string) : null) });
  const [catalog, reviewsResult] = await Promise.all([
    getPublicCatalog(),
    getPublicReviews().then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: null, error }),
    ),
  ]);
  if (reviewsResult.error) console.error("Catalogue : avis indisponibles", reviewsResult.error);
  const reviews = reviewsResult.value;
  const ratings =
    reviews?.kind === "ready"
      ? Object.fromEntries(averageByProduct(reviews.reviews))
      : {};
  // Quelques dizaines de produits : recherche, filtres, tri et pagination
  // calculés ici, par le serveur, à chaque requête.
  const browse = catalog.kind === "ready" ? browseCatalog(catalog.products, criteria) : null;

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

        {catalog.kind === "ready" && browse && catalog.products.length > 0 ? (
          <>
            <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_3px_rgb(61_43_26/0.05)] sm:p-5">
              <CatalogSearch criteria={criteria} />
              <CatalogFilters criteria={criteria} catalog={browse} total={catalog.products.length} />
            </div>

            <CatalogSummary criteria={criteria} catalog={browse} />

            <div id="resultats" className="scroll-mt-28">
              {browse.items.length > 0 ? (
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {browse.items.map((product) => (
                    <div key={product.id} className="reveal">
                      <ProductCard product={product} rating={ratings[product.id]} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-12 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-honey/12 text-honey">
                    <SearchIcon className="size-6" />
                  </span>
                  <p className="mt-4 font-display text-[20px] font-semibold text-ink">Aucun produit ne correspond</p>
                  <p className="mt-1 max-w-[380px] text-[13.5px] text-muted">
                    Essayez un autre mot, ou élargissez les filtres. Vous ne trouvez pas votre bonheur ? Écrivez-nous.
                  </p>
                  <Link
                    href="/catalogue"
                    className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-honey px-5 text-[14px] font-semibold text-white transition hover:bg-honey-dark"
                  >
                    Voir tout le catalogue
                  </Link>
                </div>
              )}
            </div>

            <CatalogPagination criteria={criteria} catalog={browse} />
          </>
        ) : null}
      </div>
    </main>
  );
}
