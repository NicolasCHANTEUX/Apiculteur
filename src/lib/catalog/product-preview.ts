// Aperçu de la carte catalogue construit à partir du formulaire produit de
// l'admin, sans dépendance à Next ni à Supabase (testable).

import type { PublicProduct } from "../../data/catalog.ts";
import {
  priceVisibilities,
  purchaseModes,
  stockDisplayModes,
  stockStatusLabels,
  conditions,
  deliveryModes,
} from "./product-form.ts";

export type PreviewSource = {
  get(name: string): string;
  getAll(name: string): string[];
};

/** Adaptateur pour un FormData (les fichiers sont ignorés). */
export function previewSourceFromForm(form: FormData): PreviewSource {
  const asText = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");
  return {
    get: (name) => asText(form.get(name)),
    getAll: (name) => form.getAll(name).map(asText),
  };
}

function euros(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Number(value);
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Produit tel que le verrait le catalogue public, à partir de la saisie en
 * cours. Les valeurs invalides sont remplacées par des valeurs neutres : la
 * validation reste faite par le serveur à l'enregistrement.
 */
export function buildPreviewProduct(
  source: PreviewSource,
  extras: { id: string; coverUrl: string | null; categories: { id: string; name: string }[] },
): PublicProduct {
  const text = (name: string) => source.get(name).trim();
  const category = extras.categories.find((item) => item.id === text("categoryId")) ?? null;
  const stockDisplayMode = oneOf(text("stockDisplayMode"), stockDisplayModes, "hidden");
  const stockQuantity = Number.parseInt(text("stockQuantity") || "0", 10);

  const mins = source.getAll("tierMin");
  const maxs = source.getAll("tierMax");
  const prices = source.getAll("tierPrice");
  const pricingTiers = mins.flatMap((rawMin, index) => {
    const minQuantity = Number.parseInt(rawMin, 10);
    const unitPrice = euros(prices[index] ?? "");
    if (!(minQuantity >= 1) || unitPrice === null) return [];
    const maxQuantity = Number.parseInt(maxs[index] ?? "", 10);
    return [{ minQuantity, maxQuantity: Number.isNaN(maxQuantity) ? null : maxQuantity, unitPrice }];
  });

  const stockStatus = text("stockStatusLabel");
  return {
    id: extras.id,
    category: category ? { id: category.id, name: category.name, slug: "" } : null,
    name: text("name") || "Nom du produit",
    slug: text("slug"),
    shortDescription: text("shortDescription") || null,
    longDescription: text("longDescription") || null,
    basePrice: euros(text("basePrice")) ?? 0,
    priceVisibility: oneOf(text("priceVisibility"), priceVisibilities, "visible"),
    purchaseMode: oneOf(text("purchaseMode"), purchaseModes, "standard"),
    featured: source.get("featured") === "on",
    stockDisplayMode,
    stockStatusLabel:
      stockDisplayMode === "status_label" && (stockStatusLabels as readonly string[]).includes(stockStatus)
        ? (stockStatus as PublicProduct["stockStatusLabel"])
        : null,
    stockCustomMessage: stockDisplayMode === "custom_message" ? text("stockCustomMessage") || null : null,
    displayedStockQuantity:
      stockDisplayMode === "exact" && Number.isFinite(stockQuantity) ? Math.max(0, stockQuantity) : null,
    seoTitle: null,
    seoDescription: null,
    sku: text("sku") || null,
    tagline: text("tagline") || null,
    condition: oneOf(text("condition"), conditions, "new"),
    defectDescription: null,
    compareAtPrice: euros(text("compareAtPrice")),
    saleUnit: text("saleUnit") || "unité",
    deliveryMode: oneOf(text("deliveryMode"), deliveryModes, "quote"),
    seasonLabel: text("seasonLabel") || null,
    publishedAt: null,
    images: extras.coverUrl ? [{ url: extras.coverUrl, altText: null }] : [],
    pricingTiers,
    attributes: [],
  };
}
