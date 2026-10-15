import Link from "next/link";
import { AvailabilityPill, PriceTag, ProductCard } from "@/components/catalog/product-card";
import { ImageBadges } from "@/components/catalog/product-card";
import { formatPrice, getImageBadges } from "@/components/catalog/product-display";
import { ArrowRightIcon, MessageCircleIcon } from "@/components/icons";
import { ProductCarousel } from "@/components/home/product-carousel";
import { SectionHeading, buttonStyles, container } from "@/components/ui";
import type { PublicProduct } from "@/data/catalog";
import { contactHref, productQuestionMessage } from "@/lib/cart/request";

/** Un seul produit : mis en valeur sur toute la largeur. */
function Spotlight({ product }: { product: PublicProduct }) {
  const image = product.images[0];
  const badges = getImageBadges(product);
  const bestTier = product.priceVisibility === "visible" && product.pricingTiers.length > 1
    ? product.pricingTiers.reduce((best, tier) => (tier.unitPrice < best.unitPrice ? tier : best))
    : null;

  return (
    <article className="reveal grid overflow-hidden rounded-3xl border border-line/60 bg-white shadow-[0_24px_60px_-32px_rgb(61_43_26/0.5)] md:grid-cols-[1.15fr_1fr]">
      <Link href={`/produits/${product.slug}`} className="group relative block aspect-[4/3] overflow-hidden bg-sand md:aspect-auto md:min-h-[380px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : null}
        <ImageBadges badges={badges} size="large" />
      </Link>
      <div className="flex flex-col p-6 sm:p-8 md:p-10">
        <div>
          <AvailabilityPill product={product} />
        </div>
        <h3 className="mt-4 font-display text-[28px] leading-[1.2] font-medium text-ink sm:text-[32px]">
          <Link href={`/produits/${product.slug}`} className="transition hover:text-honey-dark">
            {product.name}
          </Link>
        </h3>
        {product.tagline || product.category ? (
          <p className="mt-1.5 text-[14px] text-honey">{product.tagline ?? product.category?.name}</p>
        ) : null}
        {product.shortDescription ? (
          <p className="mt-4 text-[14.5px] leading-[1.7] text-body">{product.shortDescription}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-sand pt-5">
          <PriceTag product={product} />
          {bestTier ? (
            <p className="text-[12.5px] text-muted">
              Tarif dégressif : {formatPrice(bestTier.unitPrice)} l’unité dès {bestTier.minQuantity}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-7">
          <Link href={`/produits/${product.slug}`} className={buttonStyles.primary}>
            Voir le produit
            <ArrowRightIcon className="size-4" />
          </Link>
          <Link
            href={contactHref("Question sur un essaim", productQuestionMessage(product.name, product.sku), { product: product.slug })}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line px-5 text-[14px] font-medium text-ink transition hover:border-honey/50 hover:bg-cream"
          >
            <MessageCircleIcon className="size-4 text-honey" />
            Poser une question
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Carte qui complète une rangée incomplète : direction le catalogue. */
function CatalogTile({ count }: { count: number }) {
  return (
    <Link
      href="/catalogue"
      className="reveal group flex min-h-[260px] flex-col justify-between rounded-xl border-2 border-dashed border-parchment/60 bg-cream/60 p-6 transition hover:border-honey hover:bg-white"
    >
      <span className="font-display text-[22px] leading-[1.25] font-medium text-ink">
        Tout le catalogue
        <span className="mt-2 block font-sans text-[13px] font-normal text-muted">
          {count} produit{count > 1 ? "s" : ""}, avec recherche, filtres et tri.
        </span>
      </span>
      <span className="flex size-11 items-center justify-center rounded-full bg-honey text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.8)] transition group-hover:translate-x-1">
        <ArrowRightIcon className="size-5" />
      </span>
    </Link>
  );
}

// La mise en page suit le nombre de produits : un seul est mis en valeur,
// une rangée incomplète se termine par l'accès au catalogue, au-delà de
// quatre un carrousel prend le relais.
const columns: Record<number, string> = { 2: "lg:grid-cols-3", 3: "lg:grid-cols-4", 4: "lg:grid-cols-4" };

export function CatalogPreview({ products }: { products: PublicProduct[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-sand py-20 sm:py-24">
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Disponibilités"
            title="Les essaims disponibles"
            subtitle={`${products.length} produit${products.length > 1 ? "s" : ""} au catalogue en ce moment.`}
          />
          <Link href="/catalogue" className={`${buttonStyles.link} mb-2`}>
            Tout le catalogue
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="mt-10">
          {products.length === 1 ? (
            <Spotlight product={products[0]} />
          ) : products.length > 4 ? (
            <ProductCarousel products={products} />
          ) : (
            <div className={`grid gap-5 sm:grid-cols-2 ${columns[products.length]}`}>
              {products.map((product) => (
                <div key={product.id} className="reveal">
                  <ProductCard product={product} />
                </div>
              ))}
              {products.length < 4 ? <CatalogTile count={products.length} /> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
