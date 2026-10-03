import "server-only";

import { cache } from "react";
import { demoProducts } from "@/data/demo";
import { getPublicSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PublicProductImage = {
  url: string;
  altText: string | null;
};

export type PublicProductAttribute = {
  label: string;
  value: string;
  unit: string | null;
};

export type PublicPricingTier = {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
};

export type PublicProduct = {
  id: string;
  category: PublicCategory | null;
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  basePrice: number;
  priceVisibility: "visible" | "hidden" | "on_request";
  purchaseMode: "standard" | "reservation" | "quote";
  featured: boolean;
  stockDisplayMode: "hidden" | "exact" | "status_label" | "custom_message";
  stockStatusLabel:
    | "available"
    | "reservation_open"
    | "limited"
    | "coming_soon"
    | "sold_out"
    | null;
  stockCustomMessage: string | null;
  displayedStockQuantity: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sku: string | null;
  tagline: string | null;
  condition: "new" | "used" | "second_choice";
  defectDescription: string | null;
  compareAtPrice: number | null;
  saleUnit: string;
  deliveryMode: "pickup_only" | "deliverable" | "quote";
  seasonLabel: string | null;
  publishedAt: string | null;
  images: PublicProductImage[];
  pricingTiers: PublicPricingTier[];
  attributes: PublicProductAttribute[];
};

export type CatalogResult =
  | { kind: "unconfigured" }
  | { kind: "ready"; products: PublicProduct[] };

export type ProductResult =
  | { kind: "unconfigured" }
  | { kind: "ready"; product: PublicProduct | null };

type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  base_price: number | string;
  price_visibility: PublicProduct["priceVisibility"];
  purchase_mode: PublicProduct["purchaseMode"];
  featured: boolean;
  stock_display_mode: PublicProduct["stockDisplayMode"];
  stock_status_label: PublicProduct["stockStatusLabel"];
  stock_custom_message: string | null;
  displayed_stock_quantity: number | null;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
  sku: string | null;
  tagline: string | null;
  condition: PublicProduct["condition"];
  defect_description: string | null;
  compare_at_price: number | string | null;
  sale_unit: string;
  delivery_mode: PublicProduct["deliveryMode"];
  season_label: string | null;
  published_at: string | null;
};

type AttributeRow = {
  product_id: string;
  label: string;
  value: string;
  unit: string | null;
  position: number;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type ImageRow = {
  product_id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
};

type TierRow = {
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | string;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

async function hydrateProducts(rows: ProductRow[]): Promise<PublicProduct[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const productIds = rows.map((product) => product.id);
  const categoryIds = [
    ...new Set(
      rows
        .map((product) => product.category_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const [categoriesResponse, imagesResponse, tiersResponse, attributesResponse] = await Promise.all([
    categoryIds.length > 0
      ? supabase
          .from("categories")
          .select("id, name, slug")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("product_images")
      .select("product_id, url, alt_text, display_order")
      .in("product_id", productIds)
      .order("display_order"),
    supabase
      .from("pricing_tiers")
      .select("product_id, min_quantity, max_quantity, unit_price")
      .in("product_id", productIds)
      .order("min_quantity"),
    supabase
      .from("product_attributes")
      .select("product_id, label, value, unit, position")
      .in("product_id", productIds)
      .order("position"),
  ]);

  throwIfError(categoriesResponse.error, "Lecture des categories impossible");
  throwIfError(imagesResponse.error, "Lecture des images impossible");
  throwIfError(tiersResponse.error, "Lecture des paliers de prix impossible");
  throwIfError(attributesResponse.error, "Lecture des caracteristiques impossible");

  const categories = (categoriesResponse.data ?? []) as CategoryRow[];
  const images = (imagesResponse.data ?? []) as ImageRow[];
  const tiers = (tiersResponse.data ?? []) as TierRow[];
  const attributes = (attributesResponse.data ?? []) as AttributeRow[];
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category_id
      ? (categoriesById.get(row.category_id) ?? null)
      : null,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    basePrice: Number(row.base_price),
    priceVisibility: row.price_visibility,
    purchaseMode: row.purchase_mode,
    featured: row.featured,
    stockDisplayMode: row.stock_display_mode,
    stockStatusLabel: row.stock_status_label,
    stockCustomMessage: row.stock_custom_message,
    displayedStockQuantity: row.displayed_stock_quantity,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    sku: row.sku,
    tagline: row.tagline,
    condition: row.condition,
    defectDescription: row.defect_description,
    compareAtPrice:
      row.compare_at_price === null ? null : Number(row.compare_at_price),
    saleUnit: row.sale_unit,
    deliveryMode: row.delivery_mode,
    seasonLabel: row.season_label,
    publishedAt: row.published_at,
    images: images
      .filter((image) => image.product_id === row.id)
      .map((image) => ({ url: image.url, altText: image.alt_text })),
    pricingTiers: tiers
      .filter((tier) => tier.product_id === row.id)
      .map((tier) => ({
        minQuantity: tier.min_quantity,
        maxQuantity: tier.max_quantity,
        unitPrice: Number(tier.unit_price),
      })),
    attributes: attributes
      .filter((attribute) => attribute.product_id === row.id)
      .map(({ label, value, unit }) => ({ label, value, unit })),
  }));
}

export const getPublicCatalog = cache(async (): Promise<CatalogResult> => {
  if (isDemoMode()) {
    return { kind: "ready", products: demoProducts };
  }

  if (!getPublicSupabaseConfig()) {
    return { kind: "unconfigured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_catalog_products")
    .select("*")
    .order("display_order")
    .order("name");

  throwIfError(error, "Lecture du catalogue impossible");

  return {
    kind: "ready",
    products: await hydrateProducts((data ?? []) as ProductRow[]),
  };
});

export const getPublicProductBySlug = cache(
  async (slug: string): Promise<ProductResult> => {
    if (isDemoMode()) {
      return {
        kind: "ready",
        product: demoProducts.find((product) => product.slug === slug) ?? null,
      };
    }

    if (!getPublicSupabaseConfig()) {
      return { kind: "unconfigured" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_catalog_products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    throwIfError(error, "Lecture du produit impossible");

    if (!data) {
      return { kind: "ready", product: null };
    }

    const [product] = await hydrateProducts([data as ProductRow]);
    return { kind: "ready", product };
  },
);
