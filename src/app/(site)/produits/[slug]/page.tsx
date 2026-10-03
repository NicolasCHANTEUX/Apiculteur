import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { AvailabilityPill, PriceTag } from "@/components/catalog/product-card";
import { formatPrice, getImageBadge } from "@/components/catalog/product-display";
import { ArrowRightIcon, MessageCircleIcon } from "@/components/icons";
import { ReviewCard } from "@/components/reviews/review-card";
import { Eyebrow, Stars, buttonStyles, container } from "@/components/ui";
import { getPublicProductBySlug } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";
import { formatAverage, summarizeRatings } from "@/lib/domain/ratings";

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

export default async function ProductPage(
  props: PageProps<"/produits/[slug]">,
) {
  const { slug } = await props.params;
  const [result, reviewsResult] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicReviews(),
  ]);

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
  const image = product.images[0];
  const badge = getImageBadge(product);
  const reviews =
    reviewsResult.kind === "ready"
      ? reviewsResult.reviews.filter((review) => review.productId === product.id)
      : [];
  const rating = summarizeRatings(reviews.map((review) => review.rating));
  const showTiers =
    product.priceVisibility === "visible" && product.pricingTiers.length > 1;

  return (
    <main className="flex-1">
      <div className={`${container} pt-8 pb-24`}>
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-ink"
        >
          <ArrowRightIcon className="size-3.5 rotate-180" />
          Retour au catalogue
        </Link>

        <article className="mt-6 grid items-start gap-10 md:grid-cols-2 md:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand shadow-[0_24px_48px_-20px_rgb(61_43_26/0.45)]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={image.altText ?? product.name}
                className="size-full object-cover"
              />
            ) : null}
            {badge ? (
              <span className="absolute top-4 left-4 rounded-full bg-honey px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                {badge}
              </span>
            ) : null}
          </div>

          <div>
            {product.category ? <Eyebrow>{product.category.name}</Eyebrow> : null}
            <h1 className="mt-3 font-display text-[30px] leading-[1.2] font-medium text-ink sm:text-[34px]">
              {product.name}
            </h1>
            {rating.count > 0 ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                <Stars rating={rating.average} />
                {formatAverage(rating.average)} · {rating.count} avis
              </p>
            ) : null}
            <div className="mt-4">
              <AvailabilityPill product={product} />
            </div>
            {product.shortDescription ? (
              <p className="mt-5 text-[15px] leading-[1.65] text-body">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-6 rounded-xl border border-line bg-white p-5">
              <PriceTag product={product} />
              {showTiers ? (
                <table className="mt-4 w-full text-left text-[13px]">
                  <caption className="sr-only">Tarifs par quantité</caption>
                  <thead className="text-[11px] tracking-[0.06em] text-muted uppercase">
                    <tr>
                      <th className="pb-2 font-medium">Quantité</th>
                      <th className="pb-2 text-right font-medium">Prix unitaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand border-t border-sand">
                    {product.pricingTiers.map((tier) => (
                      <tr key={`${tier.minQuantity}-${tier.maxQuantity ?? "plus"}`}>
                        <td className="py-2.5 text-body">
                          {tier.maxQuantity === null
                            ? `À partir de ${tier.minQuantity}`
                            : `De ${tier.minQuantity} à ${tier.maxQuantity}`}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-ink">
                          {formatPrice(tier.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>

            <div className="mt-5 rounded-xl bg-sand p-5">
              <p className="text-[14px] font-semibold text-ink">
                Commande en ligne bientôt disponible
              </p>
              <p className="mt-1 text-[13px] leading-[1.6] text-body">
                En attendant, décrivez-moi votre projet : je vous réponds
                personnellement pour confirmer la disponibilité et organiser
                la livraison ou le retrait.
              </p>
              <Link href="/contact" className={`${buttonStyles.primary} mt-4`}>
                Poser une question
                <MessageCircleIcon className="size-4" />
              </Link>
            </div>

            {product.longDescription ? (
              <div className="mt-8 text-[14px] leading-[1.7] whitespace-pre-line text-body">
                {product.longDescription}
              </div>
            ) : null}
          </div>
        </article>

        {reviews.length > 0 ? (
          <section className="mt-20">
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
      </div>
    </main>
  );
}
