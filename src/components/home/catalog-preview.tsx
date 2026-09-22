import Link from "next/link";
import type { PublicProduct } from "@/data/catalog";
import { eurosToCents, formatEuros } from "@/lib/domain/pricing";

const statusDotColor: Record<NonNullable<PublicProduct["stockStatusLabel"]>, string> = {
  available: "bg-emerald-500",
  reservation_open: "bg-sky-500",
  limited: "bg-amber-500",
  coming_soon: "bg-stone-400",
  sold_out: "bg-stone-400",
};

const statusText: Record<NonNullable<PublicProduct["stockStatusLabel"]>, string> = {
  available: "Disponible",
  reservation_open: "Réservations ouvertes",
  limited: "Quantités limitées",
  coming_soon: "Bientôt disponible",
  sold_out: "Épuisé",
};

function availability(product: PublicProduct) {
  if (product.stockDisplayMode === "custom_message" && product.stockCustomMessage) {
    return { dot: "bg-accent", label: product.stockCustomMessage };
  }

  if (product.stockDisplayMode === "status_label" && product.stockStatusLabel) {
    return {
      dot: statusDotColor[product.stockStatusLabel],
      label: statusText[product.stockStatusLabel],
    };
  }

  return { dot: "bg-stone-300", label: "Sur demande" };
}

function priceLabel(product: PublicProduct) {
  if (product.priceVisibility === "on_request") return "Sur demande";
  if (product.priceVisibility === "hidden") return "Nous consulter";

  const lowestTier = product.pricingTiers.reduce<number | null>(
    (min, tier) => (min === null || tier.unitPrice < min ? tier.unitPrice : min),
    null,
  );
  const amount = formatEuros(eurosToCents(lowestTier ?? product.basePrice));

  return lowestTier !== null ? `À partir de ${amount}` : amount;
}

function FeaturedProductCard({ product }: { product: PublicProduct }) {
  const image = product.images[0];
  const { dot, label } = availability(product);

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#e7cf9a] to-[#b98a3f]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            className="size-full object-cover transition group-hover:scale-105"
          />
        ) : null}
        {product.featured ? (
          <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">
            Populaire
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <span className={`size-2 rounded-full ${dot}`} aria-hidden />
          {label}
        </span>
        <h3 className="font-semibold text-ink">{product.name}</h3>
        {product.shortDescription ? (
          <p className="line-clamp-2 text-xs text-ink-muted">
            {product.shortDescription}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-sm">
          <span className="text-xs text-ink-muted">À partir de </span>
          <span className="font-semibold text-ink">{priceLabel(product)}</span>
        </p>
      </div>
    </Link>
  );
}

export function CatalogPreview({ products }: { products: PublicProduct[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-tan">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
              Disponibilités
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Les essaims disponibles
            </h2>
          </div>
          <Link
            href="/catalogue"
            className="text-sm font-semibold text-accent-dark hover:text-accent"
          >
            Tout le catalogue →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <FeaturedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
