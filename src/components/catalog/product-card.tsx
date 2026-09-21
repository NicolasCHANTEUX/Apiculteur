import Link from "next/link";
import type { PublicProduct } from "@/data/catalog";
import { formatEuros, eurosToCents } from "@/lib/domain/pricing";

const stockLabels = {
  available: "Disponible",
  reservation_open: "Réservations ouvertes",
  limited: "Quantités limitées",
  coming_soon: "Bientôt disponible",
  sold_out: "Épuisé",
} as const;

export function getAvailabilityLabel(product: PublicProduct): string {
  if (
    product.stockDisplayMode === "exact" &&
    product.displayedStockQuantity !== null
  ) {
    return `${product.displayedStockQuantity} en stock`;
  }

  if (
    product.stockDisplayMode === "custom_message" &&
    product.stockCustomMessage
  ) {
    return product.stockCustomMessage;
  }

  if (product.stockDisplayMode === "status_label" && product.stockStatusLabel) {
    return stockLabels[product.stockStatusLabel];
  }

  return "Disponibilité sur demande";
}

export function getPriceLabel(product: PublicProduct): string {
  if (product.priceVisibility === "on_request") {
    return "Prix sur demande";
  }

  if (product.priceVisibility === "hidden") {
    return "Nous contacter pour le prix";
  }

  return formatEuros(eurosToCents(product.basePrice));
}

export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {product.category ? (
            <p className="mb-2 text-sm font-medium text-amber-800">
              {product.category.name}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold text-stone-950">{product.name}</h2>
        </div>
        {product.featured ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            À la une
          </span>
        ) : null}
      </div>

      <p className="mb-6 flex-1 leading-7 text-stone-600">
        {product.shortDescription ?? "Description à venir."}
      </p>

      <div className="mb-6 border-t border-stone-100 pt-4">
        <p className="font-semibold text-stone-950">{getPriceLabel(product)}</p>
        <p className="mt-1 text-sm text-stone-600">
          {getAvailabilityLabel(product)}
        </p>
      </div>

      <Link
        href={`/produits/${product.slug}`}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 font-medium text-white transition hover:bg-stone-700"
      >
        Voir le produit
      </Link>
    </article>
  );
}
