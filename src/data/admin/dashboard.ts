import "server-only";

import { requireAdmin } from "@/data/auth";
import { readinessChecks, stockLevel, type StockLevel } from "@/lib/admin/product-health";
import { bucketByDay, lastDays } from "@/lib/admin/series";
import type {
  FulfillmentStatus,
  PaymentStatus,
  ValidationStatus,
} from "@/lib/orders/labels";
import { createClient } from "@/lib/supabase/server";

export const SERIES_DAYS = 90;

export type DashboardOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  totalAmount: number;
  fulfillmentStatus: FulfillmentStatus;
  validationStatus: ValidationStatus;
  paymentStatus: PaymentStatus;
};

type ProductRef = { id: string; name: string };

export type StockItem = ProductRef & { stock: number; threshold: number | null; level: StockLevel };

export type CategorySlice = { key: string; name: string; count: number };

export type DashboardData = {
  products: { total: number; published: number; drafts: number; hidden: number; soldOut: number };
  stock: {
    units: number;
    /** Stock × prix de vente des produits en ligne ou masqués à prix affiché, en euros. */
    value: number;
    /** Produits en ligne ou masqués, les plus urgents d'abord. */
    items: StockItem[];
  };
  /** Produits non archivés par catégorie, dans l'ordre des catégories (5 parts au plus). */
  categories: CategorySlice[];
  readiness: {
    /** Part des points de contrôle remplis, de 0 à 100. */
    score: number;
    complete: number;
    total: number;
    weakest: (ProductRef & { score: number; missing: string[] })[];
  };
  /** Produits en ligne ou masqués, sous leur seuil d'alerte (stock > 0). */
  lowStock: (ProductRef & { stock: number; threshold: number })[];
  /** Produits en ligne, vendus en commande directe, sans stock. */
  outOfStock: ProductRef[];
  /** Produits non archivés sans aucune photo. */
  withoutPhoto: ProductRef[];
  ordersToProcess: number;
  ordersToValidate: number;
  reviewsPending: number;
  reviews: { count: number; average: number | null };
  latestOrders: DashboardOrder[];
  /** Les SERIES_DAYS derniers jours : commandes, chiffre d'affaires (hors refus et annulations). */
  series: { days: string[]; orders: number[]; revenue: number[] };
};

function count(response: { count: number | null; error: { message: string } | null }, label: string) {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.count ?? 0;
}

type ProductRow = {
  id: string;
  name: string;
  status: string;
  category_id: string | null;
  purchase_mode: string;
  price_visibility: string;
  base_price: number | string;
  short_description: string | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  product_images: { count: number }[] | null;
};

const levelOrder: Record<StockLevel, number> = { out: 0, low: 1, ok: 2 };

// Lectures faites avec la session de l'admin : les politiques RLS
// « Admins have full access » s'appliquent en plus de requireAdmin().
export async function getDashboardData(days: string[] = lastDays(SERIES_DAYS)): Promise<DashboardData> {
  await requireAdmin();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const since = new Date(`${days[0]}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 1);

  const [productRows, categoryRows, toProcess, toValidate, reviewsPending, reviewRows, latest, periodOrders] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, status, category_id, purchase_mode, price_visibility, base_price, short_description, stock_quantity, low_stock_threshold, product_images(count)",
        )
        .neq("status", "archived")
        .order("display_order")
        .order("name"),
      supabase.from("categories").select("id, name").order("display_order").order("name"),
      supabase
        .from("orders")
        .select("id", head)
        .in("fulfillment_status", ["pending", "preparing"])
        .neq("validation_status", "refused"),
      supabase.from("orders").select("id", head).eq("validation_status", "pending"),
      supabase.from("reviews").select("id", head).eq("status", "pending"),
      supabase.from("reviews").select("rating").eq("status", "displayed").limit(1000),
      supabase
        .from("orders")
        .select(
          "id, order_number, created_at, total_amount, fulfillment_status, validation_status, payment_status, customers(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("created_at, total_amount, validation_status, fulfillment_status")
        .gte("created_at", since.toISOString())
        .limit(5000),
    ]);

  if (productRows.error) throw new Error(`Produits: ${productRows.error.message}`);
  if (categoryRows.error) throw new Error(`Catégories: ${categoryRows.error.message}`);
  if (latest.error) throw new Error(`Commandes: ${latest.error.message}`);
  if (periodOrders.error) throw new Error(`Commandes de la période: ${periodOrders.error.message}`);

  const products = (productRows.data ?? []) as ProductRow[];
  const listed = products.filter((row) => row.status === "published" || row.status === "hidden");
  const imageCount = (row: ProductRow) => row.product_images?.[0]?.count ?? 0;

  // Stock --------------------------------------------------------------------
  const items: StockItem[] = listed
    .map((row) => ({
      id: row.id,
      name: row.name,
      stock: row.stock_quantity,
      threshold: row.low_stock_threshold,
      level: stockLevel(row.stock_quantity, row.low_stock_threshold, row.purchase_mode),
    }))
    .sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.stock - b.stock);
  const value = listed
    .filter((row) => row.price_visibility === "visible")
    .reduce((total, row) => total + row.stock_quantity * Number(row.base_price), 0);

  // Catégories : couleur liée à la catégorie (son ordre), jamais au rang.
  const groups = [
    ...(categoryRows.data ?? []).map((category) => ({
      key: category.id as string,
      name: category.name as string,
      count: products.filter((row) => row.category_id === category.id).length,
    })),
    { key: "none", name: "Sans catégorie", count: products.filter((row) => !row.category_id).length },
  ].filter((group) => group.count > 0);
  const categories =
    groups.length <= 5
      ? groups
      : [
          ...groups.slice(0, 4),
          { key: "other", name: "Autres", count: groups.slice(4).reduce((total, group) => total + group.count, 0) },
        ];

  // Fiches complètes ---------------------------------------------------------
  const scored = products.map((row) => {
    const checks = readinessChecks({
      imageCount: imageCount(row),
      shortDescription: row.short_description ?? "",
      categoryId: row.category_id ?? "",
      basePrice: String(row.base_price),
      priceVisibility: row.price_visibility,
      purchaseMode: row.purchase_mode,
      stockQuantity: String(row.stock_quantity),
    });
    const passed = checks.filter((check) => check.ok).length;
    return {
      id: row.id,
      name: row.name,
      score: Math.round((passed / checks.length) * 100),
      missing: checks.filter((check) => !check.ok).map((check) => check.label),
    };
  });

  // Avis et commandes --------------------------------------------------------
  const ratings = reviewRows.error ? [] : (reviewRows.data ?? []).map((row) => Number(row.rating));
  const counted = (periodOrders.data ?? []).filter(
    (row) => row.validation_status !== "refused" && row.fulfillment_status !== "cancelled",
  );

  return {
    products: {
      total: products.length,
      published: products.filter((row) => row.status === "published").length,
      drafts: products.filter((row) => row.status === "draft").length,
      hidden: products.filter((row) => row.status === "hidden").length,
      soldOut: products.filter((row) => row.status === "sold_out").length,
    },
    stock: { units: listed.reduce((total, row) => total + row.stock_quantity, 0), value, items },
    categories,
    readiness: {
      score: scored.length ? Math.round(scored.reduce((total, row) => total + row.score, 0) / scored.length) : 0,
      complete: scored.filter((row) => row.score === 100).length,
      total: scored.length,
      weakest: scored.filter((row) => row.score < 100).sort((a, b) => a.score - b.score).slice(0, 3),
    },
    lowStock: items
      .filter((item) => item.level === "low")
      .map((item) => ({ id: item.id, name: item.name, stock: item.stock, threshold: item.threshold ?? 0 })),
    outOfStock: products
      .filter((row) => row.status === "published" && row.purchase_mode === "standard" && row.stock_quantity <= 0)
      .map(({ id, name }) => ({ id, name })),
    withoutPhoto: products.filter((row) => imageCount(row) === 0).map(({ id, name }) => ({ id, name })),
    ordersToProcess: count(toProcess, "Commandes à traiter"),
    ordersToValidate: count(toValidate, "Commandes à valider"),
    reviewsPending: count(reviewsPending, "Avis en attente"),
    reviews: {
      count: ratings.length,
      average: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : null,
    },
    latestOrders: (latest.data ?? []).map((row) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      return {
        id: row.id,
        orderNumber: row.order_number,
        createdAt: row.created_at,
        customerName: customer?.full_name ?? null,
        totalAmount: Number(row.total_amount),
        fulfillmentStatus: row.fulfillment_status,
        validationStatus: row.validation_status,
        paymentStatus: row.payment_status,
      };
    }),
    series: {
      days,
      orders: bucketByDay(days, counted.map((row) => ({ at: row.created_at as string }))),
      revenue: bucketByDay(
        days,
        counted.map((row) => ({ at: row.created_at as string, value: Number(row.total_amount) })),
      ),
    },
  };
}
