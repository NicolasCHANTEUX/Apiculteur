import "server-only";

import { requireAdmin } from "@/data/auth";
import type {
  FulfillmentStatus,
  PaymentStatus,
  ValidationStatus,
} from "@/lib/orders/labels";
import { createClient } from "@/lib/supabase/server";

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

export type DashboardData = {
  products: { total: number; published: number };
  lowStock: { id: string; name: string; stock: number; threshold: number }[];
  ordersToProcess: number;
  ordersToValidate: number;
  reviewsPending: number;
  latestOrders: DashboardOrder[];
};

function count(response: { count: number | null; error: { message: string } | null }, label: string) {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.count ?? 0;
}

// Lectures faites avec la session de l'admin : les politiques RLS
// « Admins have full access » s'appliquent en plus de requireAdmin().
export async function getDashboardData(): Promise<DashboardData> {
  await requireAdmin();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [
    productsTotal,
    productsPublished,
    lowStockRows,
    toProcess,
    toValidate,
    reviewsPending,
    latest,
  ] = await Promise.all([
    supabase.from("products").select("id", head),
    supabase.from("products").select("id", head).eq("status", "published"),
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold")
      .not("low_stock_threshold", "is", null)
      .in("status", ["published", "hidden"]),
    supabase
      .from("orders")
      .select("id", head)
      .in("fulfillment_status", ["pending", "preparing"])
      .neq("validation_status", "refused"),
    supabase.from("orders").select("id", head).eq("validation_status", "pending"),
    supabase.from("reviews").select("id", head).eq("status", "pending"),
    supabase
      .from("orders")
      .select(
        "id, order_number, created_at, total_amount, fulfillment_status, validation_status, payment_status, customers(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (lowStockRows.error) throw new Error(`Stock: ${lowStockRows.error.message}`);
  if (latest.error) throw new Error(`Commandes: ${latest.error.message}`);

  return {
    products: {
      total: count(productsTotal, "Produits"),
      published: count(productsPublished, "Produits publiés"),
    },
    lowStock: (lowStockRows.data ?? [])
      .filter((row) => row.stock_quantity <= row.low_stock_threshold)
      .map((row) => ({
        id: row.id,
        name: row.name,
        stock: row.stock_quantity,
        threshold: row.low_stock_threshold,
      })),
    ordersToProcess: count(toProcess, "Commandes à traiter"),
    ordersToValidate: count(toValidate, "Commandes à valider"),
    reviewsPending: count(reviewsPending, "Avis en attente"),
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
  };
}
