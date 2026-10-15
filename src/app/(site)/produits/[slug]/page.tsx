import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { AvailabilityPill, ProductCard } from "@/components/catalog/product-card";
import { getImageBadges } from "@/components/catalog/product-display";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { PurchasePanel } from "@/components/catalog/purchase-panel";
import { ArrowRightIcon, ChevronRightIcon, ClipboardListIcon, ClockIcon, LeafIcon, PackageIcon, TagIcon, TruckIcon } from "@/components/icons";
import { ReviewCard } from "@/components/reviews/review-card";
import { Eyebrow, Stars, container } from "@/components/ui";
import { getPublicCatalog, getPublicProductBySlug } from "@/data/catalog";
import { getPublishedLegal } from "@/data/legal";
import { getPublicReviews } from "@/data/reviews";
import { conditionLabels, deliveryModeLabels } from "@/lib/catalog/labels";
import { averageByProduct, formatAverage, summarizeRatings } from "@/lib/domain/ratings";

export async function generateMetadata(
  props: PageProps<"/produits/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getPublicProductBySlug(slug);

  if (result.kind !== "ready" || !result.product) {
    return { title: "Produit" };
  }

  return {
    title: result.product.seoTitle ?? result.product.name,
    description:
      result.product.seoDescription ?? result.product.shortDescription,
  };
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line/80 bg-white p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-honey/12 text-honey">{icon}</span>
      <div className="min-w-0 text-[13px] leading-[1.45]">
        <dt className="text-[11px] tracking-[0.06em] text-muted uppercase">{label}</dt>
        <dd className="mt-0.5 font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

export default async function ProductPage(
  props: PageProps<"/produits/[slug]">,
) {
  const { slug } = await props.params;
  // Rendue à chaque requête : un produit masqué ou épuisé l'est aussitôt sur
  // la fiche (aucune mise en cache).
  const [result, catalog, reviewsResponse, legal] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicCatalog().catch((error: unknown) => {
      console.error("Fiche produit : catalogue indisponible", error);
      return null;
    }),
    getPublicReviews().then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: null, error }),
    ),
    getPublishedLegal(),
  ]);
  if (reviewsResponse.error) console.error("Fiche produit : avis indisponibles", reviewsResponse.error);
  const reviewsResult = reviewsResponse.value;

  if (result.kind === "unconfigured") {
    return (
      <main className={`${container} flex-1 py-16`}>
        <CatalogUnconfigured />
      </main>
    );
  }

  if (!result.product) {
    notFound();
  }

  const product = result.product;
  const allReviews = reviewsResult?.kind === "ready" ? reviewsResult.reviews : [];
  const reviews = allReviews.filter((review) => review.productId === product.id);
  const rating = summarizeRatings(reviews.map((review) => review.rating));
  const ratings = Object.fromEntries(averageByProduct(allReviews));

  // « Vous aimerez aussi » : même catégorie d'abord, puis le reste du catalogue.
  const others = catalog?.kind === "ready" ? catalog.products.filter((item) => item.id !== product.id) : [];
  const related = [
    ...others.filter((item) => item.category?.id && item.category.id === product.category?.id),
    ...others.filter((item) => !item.category?.id || item.category.id !== product.category?.id),
  ].slice(0, 4);

  return (
    <main className="flex-1">
      <div className={`${container} pt-8 pb-24`}>
        <nav aria-label="Fil d’Ariane">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            {[
              { href: "/", label: "Accueil" },
              { href: "/catalogue", label: "Nos essaims" },
              ...(product.category
                ? [{ href: `/catalogue?categorie=${product.category.slug}`, label: product.category.name }]
                : []),
            ].map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                <Link href={crumb.href} className="transition hover:text-ink">{crumb.label}</Link>
                <ChevronRightIcon className="size-3.5 text-line" aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="max-w-[240px] truncate text-ink">{product.name}</li>
          </ol>
        </nav>

        <article className="mt-6 grid items-start gap-10 md:grid-cols-2 md:gap-12">
          <div className="md:sticky md:top-[calc(var(--header-height)+1.5rem)]">
            <ProductGallery images={product.images} name={product.name} badges={getImageBadges(product)} />
          </div>

          <div className="min-w-0">
            {product.category ? <Eyebrow>{product.category.name}</Eyebrow> : null}
            <h1 className="mt-3 font-display text-[30px] leading-[1.15] font-medium text-ink sm:text-[38px]">
              {product.name}
            </h1>
            {product.tagline ? (
              <p className="mt-2 text-[15px] text-honey">{product.tagline}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AvailabilityPill product={product} />
              {rating.count > 0 ? (
                <a href="#avis" className="flex items-center gap-2 text-[13px] text-muted transition hover:text-ink">
                  <Stars rating={rating.average} />
                  {formatAverage(rating.average)} · {rating.count} avis
                </a>
              ) : null}
            </div>
            {product.shortDescription ? (
              <p className="mt-5 text-[15.5px] leading-[1.65] text-body">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-6">
              <PurchasePanel product={product} vatMode={legal?.config.vatMode ?? null} />
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {product.category ? (
                <Fact icon={<LeafIcon className="size-[18px]" />} label="Type">
                  {product.category.name}
                  {product.condition !== "new" ? ` · ${conditionLabels[product.condition].toLowerCase()}` : ""}
                </Fact>
              ) : null}
              {product.stockDisplayMode === "exact" && product.displayedStockQuantity !== null ? (
                <Fact icon={<ClipboardListIcon className="size-[18px]" />} label="Stock">
                  {product.displayedStockQuantity > 0
                    ? `${product.displayedStockQuantity} disponible${product.displayedStockQuantity > 1 ? "s" : ""}`
                    : "Épuisé pour le moment"}
                </Fact>
              ) : null}
              <Fact icon={<TruckIcon className="size-[18px]" />} label="Retrait / transport">
                {deliveryModeLabels[product.deliveryMode]}
              </Fact>
              {product.seasonLabel ? (
                <Fact icon={<ClockIcon className="size-[18px]" />} label="Disponibilité">{product.seasonLabel}</Fact>
              ) : null}
              {product.sku ? (
                <Fact icon={<TagIcon className="size-[18px]" />} label="Référence">{product.sku}</Fact>
              ) : null}
              {product.condition !== "new" && !product.category ? (
                <Fact icon={<PackageIcon className="size-[18px]" />} label="État">{conditionLabels[product.condition]}</Fact>
              ) : null}
            </dl>

            {product.condition !== "new" && product.defectDescription ? (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
                <p className="text-[14px] font-semibold text-ink">
                  {conditionLabels[product.condition]} : défauts constatés
                </p>
                <p className="mt-1 text-[13px] leading-[1.6] whitespace-pre-line text-body">
                  {product.defectDescription}
                </p>
              </div>
            ) : null}

            {product.longDescription ? (
              <section className="mt-10">
                <h2 className="font-display text-[22px] font-medium text-ink">Description</h2>
                <div className="mt-3 text-[14.5px] leading-[1.75] whitespace-pre-line text-body">
                  {product.longDescription}
                </div>
              </section>
            ) : null}

            {product.attributes.length > 0 ? (
              <section className="mt-10">
                <h2 className="font-display text-[22px] font-medium text-ink">Caractéristiques</h2>
                <dl className="mt-3 divide-y divide-sand overflow-hidden rounded-xl border border-line bg-white">
                  {product.attributes.map((attribute) => (
                    <div key={`${attribute.label}-${attribute.value}`} className="flex justify-between gap-4 px-4 py-3 text-[13.5px] odd:bg-cream/50">
                      <dt className="text-muted">{attribute.label}</dt>
                      <dd className="text-right font-medium text-ink">
                        {attribute.value}
                        {attribute.unit ? ` ${attribute.unit}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        </article>

        {reviews.length > 0 ? (
          <section id="avis" className="reveal mt-20 scroll-mt-24">
            <h2 className="font-display text-[26px] font-medium text-ink">
              Avis sur ce produit
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} variant="full" />
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="reveal mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-[26px] font-medium text-ink">Vous aimerez aussi</h2>
              <Link href="/catalogue" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-honey transition hover:text-honey-dark">
                Tout le catalogue
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} rating={ratings[item.id]} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
