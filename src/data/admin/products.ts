import "server-only";

import { requireAdmin } from "@/data/auth";
import { isStockFilter, stockFilters, stockLevel, type StockLevel } from "@/lib/admin/product-health";
import { productStatuses } from "@/lib/catalog/product-form";
import { createClient } from "@/lib/supabase/server";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
};

export type ProductStatus = (typeof productStatuses)[number];

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: ProductStatus;
  categoryName: string | null;
  basePrice: number;
  priceVisibility: "visible" | "hidden" | "on_request";
  purchaseMode: "standard" | "reservation" | "quote";
  saleUnit: string;
  featured: boolean;
  stockQuantity: number;
  lowStockThreshold: number | null;
  stockLevel: StockLevel;
  coverUrl: string | null;
  imageCount: number;
  updatedAt: string;
};

export type AdminProductList = {
  products: AdminProductRow[];
  /** Par statut, selon la recherche, la catégorie et le stock choisis. « all » exclut les archivés. */
  statusCounts: Record<ProductStatus | "all", number>;
};

export type AdminProductImage = {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  storagePath: string | null;
};

export type AdminProduct = {
  id: string;
  updatedAt: string;
  values: Record<string, string | boolean>;
  tiers: { min: number; max: number | null; price: number }[];
  attributes: { label: string; value: string; unit: string | null }[];
  images: AdminProductImage[];
};

export type AdminProductFilters = { q: string; categorie: string; statut: string; stock: string };

function fail(context: string, error: { message: string } | null) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin("/admin/categories");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, display_order, is_active, products(count)")
    .order("display_order")
    .order("name");
  fail("Catégories", error);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    displayOrder: row.display_order,
    isActive: row.is_active,
    productCount: (row.products as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

/**
 * Produits proposés par la recherche rapide (Ctrl K). Lue par la mise en page
 * de l'administration : une erreur donne une liste vide plutôt qu'un écran
 * d'erreur sur toutes les pages.
 */
export async function listCommandProducts(): Promise<{ id: string; name: string; status: ProductStatus }[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, status")
    .neq("status", "archived")
    .order("name")
    .limit(300);
  if (error) {
    console.error("Recherche rapide", error.code, error.message);
    return [];
  }
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, status: row.status }));
}

// Le catalogue d'un apiculteur compte quelques dizaines de produits : la
// recherche et la catégorie sont filtrées en base, le statut et le niveau de
// stock en mémoire, ce qui donne les compteurs des onglets sans autre requête.
export async function listAdminProducts(filters: AdminProductFilters): Promise<AdminProductList> {
  await requireAdmin("/admin/produits");
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, sku, status, base_price, price_visibility, purchase_mode, sale_unit, featured, stock_quantity, low_stock_threshold, updated_at, categories(name), product_images(url, display_order)",
    )
    .order("display_order")
    .order("name")
    .limit(500);

  if (filters.q) {
    // Échappe les caractères spéciaux du filtre PostgREST.
    const term = filters.q.replace(/[%,()*"\\]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (/^[0-9a-f-]{36}$/i.test(filters.categorie)) query = query.eq("category_id", filters.categorie);

  const { data, error } = await query;
  fail("Produits", error);

  const rows: AdminProductRow[] = (data ?? []).map((row) => {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const images = (row.product_images ?? []) as { url: string; display_order: number }[];
    const cover = [...images].sort((a, b) => a.display_order - b.display_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      status: row.status,
      categoryName: category?.name ?? null,
      basePrice: Number(row.base_price),
      priceVisibility: row.price_visibility,
      purchaseMode: row.purchase_mode,
      saleUnit: row.sale_unit ?? "unité",
      featured: Boolean(row.featured),
      stockQuantity: row.stock_quantity,
      lowStockThreshold: row.low_stock_threshold,
      stockLevel: stockLevel(row.stock_quantity, row.low_stock_threshold, row.purchase_mode),
      coverUrl: cover?.url ?? null,
      imageCount: images.length,
      updatedAt: row.updated_at,
    };
  });

  const stockFilter = isStockFilter(filters.stock) ? stockFilters[filters.stock] : null;
  const byStock = stockFilter ? rows.filter((row) => row.stockLevel === stockFilter.level) : rows;

  const statusCounts = Object.fromEntries(
    [...productStatuses, "all" as const].map((status) => [status, 0]),
  ) as AdminProductList["statusCounts"];
  for (const row of byStock) {
    statusCounts[row.status] += 1;
    if (row.status !== "archived") statusCounts.all += 1;
  }

  const status = (productStatuses as readonly string[]).includes(filters.statut) ? filters.statut : null;
  return {
    products: byStock.filter((row) => (status ? row.status === status : row.status !== "archived")),
    statusCounts,
  };
}

const formFields: Record<string, string> = {
  name: "name",
  slug: "slug",
  sku: "sku",
  tagline: "tagline",
  categoryId: "category_id",
  shortDescription: "short_description",
  longDescription: "long_description",
  basePrice: "base_price",
  compareAtPrice: "compare_at_price",
  priceVisibility: "price_visibility",
  purchaseMode: "purchase_mode",
  status: "status",
  condition: "condition",
  defectDescription: "defect_description",
  saleUnit: "sale_unit",
  deliveryMode: "delivery_mode",
  seasonLabel: "season_label",
  stockQuantity: "stock_quantity",
  lowStockThreshold: "low_stock_threshold",
  stockDisplayMode: "stock_display_mode",
  stockStatusLabel: "stock_status_label",
  stockCustomMessage: "stock_custom_message",
  displayOrder: "display_order",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
};

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  await requireAdmin(`/admin/produits/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("products")
    .select(
      "*, pricing_tiers(min_quantity, max_quantity, unit_price), product_attributes(label, value, unit, position), product_images(id, url, alt_text, display_order, storage_path)",
    )
    .eq("id", id)
    .maybeSingle();
  fail("Produit", error);
  if (!row) return null;

  const values: Record<string, string | boolean> = { featured: Boolean(row.featured) };
  for (const [field, column] of Object.entries(formFields)) {
    const value = row[column];
    values[field] = value === null || value === undefined ? "" : String(value);
  }
  // Prix affichés au format français dans le formulaire.
  for (const field of ["basePrice", "compareAtPrice"]) {
    if (values[field]) values[field] = String(values[field]).replace(".", ",");
  }

  type Tier = { min_quantity: number; max_quantity: number | null; unit_price: number | string };
  type Attribute = { label: string; value: string; unit: string | null; position: number };
  type Image = { id: string; url: string; alt_text: string | null; display_order: number; storage_path: string | null };

  return {
    id: row.id,
    updatedAt: row.updated_at,
    values,
    tiers: ((row.pricing_tiers ?? []) as Tier[])
      .sort((a, b) => a.min_quantity - b.min_quantity)
      .map((tier) => ({ min: tier.min_quantity, max: tier.max_quantity, price: Number(tier.unit_price) })),
    attributes: ((row.product_attributes ?? []) as Attribute[])
      .sort((a, b) => a.position - b.position)
      .map(({ label, value, unit }) => ({ label, value, unit })),
    images: ((row.product_images ?? []) as Image[])
      .sort((a, b) => a.display_order - b.display_order)
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text,
        displayOrder: image.display_order,
        storagePath: image.storage_path,
      })),
  };
}
