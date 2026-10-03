import Link from "next/link";
import type { PublicProduct } from "@/data/catalog";
import {
  availabilityToneStyles,
  getAvailability,
  getImageBadge,
  getPriceDisplay,
} from "@/components/catalog/product-display";
import { Stars } from "@/components/ui";
import type { RatingSummary } from "@/lib/domain/ratings";

export function AvailabilityPill({ product }: { product: PublicProduct }) {
  const availability = getAvailability(product);
  if (!availability) return null;
  const styles = availabilityToneStyles[availability.tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] leading-snug font-medium ${styles.pill}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      {availability.label}
    </span>
  );
}

export function PriceTag({ product }: { product: PublicProduct }) {
  const price = getPriceDisplay(product);

  return (
    <div>
      <p className="text-[9px] tracking-[0.06em] text-muted uppercase">
        {price.label}
      </p>
      <p className="mt-0.5 text-ink">
        {price.kind === "amount" ? (
          <>
            <span className="text-[15px] font-semibold">{price.amount}</span>
            {price.unit ? (
              <span className="text-[11px] text-muted"> /{price.unit}</span>
            ) : null}
          </>
        ) : (
          <span className="text-[14px] font-semibold">{price.text}</span>
        )}
      </p>
    </div>
  );
}

export function ProductCard({
  product,
  rating,
}: {
  product: PublicProduct;
  rating?: RatingSummary;
}) {
  const image = product.images[0];
  const badge = getImageBadge(product);

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line/50 bg-white shadow-[0_1px_3px_rgb(61_43_26/0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(61_43_26/0.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
        {badge ? (
          <span className="absolute top-3 left-3 rounded-full bg-honey px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1 pb-3">
          <AvailabilityPill product={product} />
          <h3 className="mt-3 font-display text-[14px] leading-snug font-semibold text-ink">
            {product.name}
          </h3>
          {product.category ? (
            <p className="mt-1 text-[11px] text-honey">
              {product.category.name}
            </p>
          ) : null}
          {product.shortDescription ? (
            <p className="mt-2.5 line-clamp-2 text-[11px] leading-[1.65] text-muted">
              {product.shortDescription}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-sand pt-3">
          <PriceTag product={product} />
          {rating && rating.count > 0 ? (
            <Stars rating={rating.average} className="text-[12px]" />
          ) : null}
        </div>
      </div>
    </Link>
  );
}
