import type { PublicProduct } from "@/data/catalog";
import { eurosToCents } from "@/lib/domain/pricing";

// Comme formatEuros, mais sans ",00" pour les montants ronds ("145 €").
export function formatPrice(euros: number): string {
  const cents = eurosToCents(euros);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export type AvailabilityTone = "green" | "orange" | "blue" | "neutral";

export const availabilityToneStyles: Record<
  AvailabilityTone,
  { pill: string; dot: string }
> = {
  green: { pill: "border-green-200 bg-green-50 text-green-700", dot: "bg-green-600" },
  orange: { pill: "border-orange-200 bg-orange-50 text-orange-700", dot: "bg-orange-600" },
  blue: { pill: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-600" },
  neutral: { pill: "border-line bg-line text-brown", dot: "bg-brown/60" },
};

const statusLabels: Record<
  NonNullable<PublicProduct["stockStatusLabel"]>,
  { label: string; tone: AvailabilityTone }
> = {
  available: { label: "Disponible", tone: "green" },
  limited: { label: "Quantités limitées", tone: "orange" },
  reservation_open: { label: "Réservations ouvertes", tone: "blue" },
  coming_soon: { label: "Bientôt disponible", tone: "neutral" },
  sold_out: { label: "Épuisé", tone: "neutral" },
};

export function getAvailability(
  product: PublicProduct,
): { label: string; tone: AvailabilityTone } | null {
  switch (product.stockDisplayMode) {
    case "status_label":
      return product.stockStatusLabel
        ? statusLabels[product.stockStatusLabel]
        : null;
    case "custom_message":
      if (!product.stockCustomMessage) return null;
      return {
        label: product.stockCustomMessage,
        tone: product.purchaseMode === "reservation" ? "blue" : "neutral",
      };
    case "exact":
      if (product.displayedStockQuantity === null) return null;
      return product.displayedStockQuantity > 0
        ? { label: `${product.displayedStockQuantity} en stock`, tone: "green" }
        : statusLabels.sold_out;
    case "hidden":
      return null;
  }
}

// Badge posé sur la photo de la carte produit.
export function getImageBadge(product: PublicProduct): string | null {
  if (product.featured) return "Populaire";
  if (product.condition === "used") return "Occasion";
  if (product.condition === "second_choice") return "Second choix";
  if (product.stockStatusLabel === "limited") return "Dernières unités";
  if (
    product.purchaseMode === "reservation" ||
    product.stockStatusLabel === "reservation_open"
  ) {
    return "Nouvelle saison";
  }
  return null;
}

export type PriceDisplay =
  | {
      kind: "amount";
      label: string;
      amount: string;
      unit: string | null;
      // Prix barré (ancien prix) et remise en %, si renseignés.
      compareAt: string | null;
      discountPercent: number | null;
    }
  | { kind: "text"; label: string; text: string };

export function getPriceDisplay(product: PublicProduct): PriceDisplay {
  if (product.priceVisibility === "on_request") {
    return { kind: "text", label: "Prix", text: "Sur demande" };
  }
  if (product.priceVisibility === "hidden") {
    return { kind: "text", label: "Prix", text: "Nous consulter" };
  }

  const prices = [
    product.basePrice,
    ...product.pricingTiers.map((tier) => tier.unitPrice),
  ];
  const lowest = Math.min(...prices);
  // Le prix barré se rapporte au prix de base : on ne l'affiche pas à côté
  // d'un « à partir de » issu d'un palier, ce qui gonflerait la remise.
  const compareAt =
    product.compareAtPrice !== null &&
    product.compareAtPrice > product.basePrice &&
    lowest === product.basePrice
      ? product.compareAtPrice
      : null;

  return {
    kind: "amount",
    label:
      lowest < product.basePrice || product.pricingTiers.length > 1
        ? "À partir de"
        : "Prix",
    amount: formatPrice(lowest),
    unit: product.saleUnit || null,
    compareAt: compareAt === null ? null : formatPrice(compareAt),
    discountPercent:
      compareAt === null
        ? null
        : Math.round(((compareAt - product.basePrice) / compareAt) * 100),
  };
}
