import "server-only";

import { requireAdmin } from "@/data/auth";
import { describeAuditAction } from "@/lib/admin/audit-labels";
import {
  orderState,
  type FulfillmentStatus,
  type OrderStateKey,
  type PaymentStatus,
  type ValidationStatus,
} from "@/lib/orders/labels";
import { createClient } from "@/lib/supabase/server";

export const orderTabs = {
  "a-valider": "À valider",
  "en-cours": "En cours",
  terminees: "Terminées",
  annulees: "Refusées et annulées",
  toutes: "Toutes",
} as const;

export type OrderTab = keyof typeof orderTabs;

const tabStates: Record<OrderTab, OrderStateKey[] | null> = {
  "a-valider": ["to_validate"],
  "en-cours": ["preparing", "ready", "shipped"],
  terminees: ["done"],
  annulees: ["refused", "cancelled"],
  toutes: null,
};

export function isOrderTab(value: string): value is OrderTab {
  return Object.hasOwn(orderTabs, value);
}

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string | null;
  companyName: string | null;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  deliveryMethod: "delivery" | "pickup";
  requestedDate: string | null;
  state: { key: OrderStateKey; label: string };
  paymentStatus: PaymentStatus;
  reviewReasons: string[];
};

type OrderRow = {
  id: string;
  order_number: string;
  created_at: string;
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  total_amount: number | string;
  delivery_method: "delivery" | "pickup";
  requested_date: string | null;
  validation_status: ValidationStatus;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  review_reasons: string[] | null;
  customers: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  order_items: { quantity: number }[] | null;
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Quelques dizaines de commandes par saison : filtrage et compteurs en
// mémoire sur les 500 plus récentes.
export async function listAdminOrders(filters: { tab: OrderTab; q: string }) {
  await requireAdmin("/admin/commandes");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, contact_name, contact_email, company_name, total_amount, delivery_method, requested_date, validation_status, fulfillment_status, payment_status, review_reasons, customers(full_name, email), order_items(quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Commandes: ${error.message}`);

  const rows: AdminOrderRow[] = ((data ?? []) as OrderRow[]).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const items = row.order_items ?? [];
    return {
      id: row.id,
      orderNumber: row.order_number,
      createdAt: row.created_at,
      customerName: row.contact_name ?? customer?.full_name ?? "Client",
      customerEmail: row.contact_email ?? customer?.email ?? null,
      companyName: row.company_name,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: Number(row.total_amount),
      deliveryMethod: row.delivery_method,
      requestedDate: row.requested_date,
      state: orderState(row.validation_status, row.fulfillment_status),
      paymentStatus: row.payment_status,
      reviewReasons: row.review_reasons ?? [],
    };
  });

  const words = normalize(filters.q).split(/\s+/).filter(Boolean);
  const searched = words.length
    ? rows.filter((row) => {
        const haystack = normalize(`${row.orderNumber} ${row.customerName} ${row.customerEmail ?? ""} ${row.companyName ?? ""}`);
        return words.every((word) => haystack.includes(word));
      })
    : rows;

  const counts = Object.fromEntries(
    (Object.keys(orderTabs) as OrderTab[]).map((tab) => {
      const states = tabStates[tab];
      return [tab, states ? searched.filter((row) => states.includes(row.state.key)).length : searched.length];
    }),
  ) as Record<OrderTab, number>;
  const states = tabStates[filters.tab];

  return {
    orders: states ? searched.filter((row) => states.includes(row.state.key)) : searched,
    counts,
  };
}

/** Nombre de demandes à valider (badge de la navigation). Zéro en cas d'erreur. */
export async function countOrdersToValidate(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("validation_status", "pending")
    .neq("fulfillment_status", "cancelled");
  if (error) {
    console.error("Commandes à valider", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}

export type AdminOrderLine = {
  id: string;
  productId: string;
  name: string;
  slug: string | null;
  saleUnit: string | null;
  purchaseMode: string | null;
  /** Stock actuel du produit (vente directe), pour décider en connaissance de cause. */
  currentStock: number | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrderEvent = { id: string; createdAt: string; label: string; detail: string | null };

export type AdminOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  state: { key: OrderStateKey; label: string };
  validationStatus: ValidationStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
    professionalId: string | null;
    since: string | null;
    otherOrders: number;
  };
  deliveryMethod: "delivery" | "pickup";
  address: { line1: string | null; postalCode: string | null; city: string | null } | null;
  requestedDate: string | null;
  message: string | null;
  decisionNote: string | null;
  internalNote: string | null;
  reviewReasons: string[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  stockReserved: boolean;
  lines: AdminOrderLine[];
  history: AdminOrderEvent[];
};

type DetailRow = {
  [column: string]: unknown;
  customers: { id: string; full_name: string; email: string; phone: string | null; created_at: string } | null;
  order_items: {
    id: string;
    product_id: string;
    product_name_snapshot: string;
    unit_price: number | string;
    quantity: number;
    line_total: number | string;
    products: { slug: string; sale_unit: string | null; purchase_mode: string; stock_quantity: number } | null;
  }[] | null;
};

export async function getAdminOrder(id: string): Promise<AdminOrder | null> {
  await requireAdmin(`/admin/commandes/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, customers(id, full_name, email, phone, created_at), order_items(id, product_id, product_name_snapshot, unit_price, quantity, line_total, products(slug, sale_unit, purchase_mode, stock_quantity))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Commande: ${error.message}`);
  if (!data) return null;
  const row = data as DetailRow;
  const text = (column: string) => (typeof row[column] === "string" ? (row[column] as string) : null);

  const [history, others] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, action, metadata, created_at")
      .eq("entity_type", "order")
      .eq("entity_id", id)
      .order("created_at", { ascending: true }),
    row.customers
      ? supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", row.customers.id).neq("id", id)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (history.error) console.error("Historique de commande", history.error.message);

  const validation = row.validation_status as ValidationStatus;
  const fulfillment = row.fulfillment_status as FulfillmentStatus;

  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    decidedAt: text("decided_at"),
    state: orderState(validation, fulfillment),
    validationStatus: validation,
    fulfillmentStatus: fulfillment,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentMethod: text("payment_method"),
    customer: {
      id: row.customers?.id ?? "",
      name: text("contact_name") ?? row.customers?.full_name ?? "Client",
      email: text("contact_email") ?? row.customers?.email ?? null,
      phone: text("contact_phone") ?? row.customers?.phone ?? null,
      companyName: text("company_name"),
      professionalId: text("professional_id"),
      since: row.customers?.created_at ?? null,
      otherOrders: others.count ?? 0,
    },
    deliveryMethod: row.delivery_method as "delivery" | "pickup",
    address:
      row.delivery_method === "delivery"
        ? { line1: text("delivery_address_line1"), postalCode: text("delivery_postal_code"), city: text("delivery_city") }
        : null,
    requestedDate: text("requested_date"),
    message: text("customer_message"),
    decisionNote: text("admin_validation_note"),
    internalNote: text("admin_internal_note"),
    reviewReasons: (row.review_reasons as string[] | null) ?? [],
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total_amount),
    stockReserved: Boolean(row.stock_reserved),
    lines: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name_snapshot,
      slug: item.products?.slug ?? null,
      saleUnit: item.products?.sale_unit ?? null,
      purchaseMode: item.products?.purchase_mode ?? null,
      currentStock: item.products?.purchase_mode === "standard" ? item.products.stock_quantity : null,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
    history: (history.data ?? []).map((event) => ({
      id: event.id as string,
      createdAt: event.created_at as string,
      label: describeAuditAction(event.action as string, event.metadata as Record<string, unknown> | null),
      detail: typeof (event.metadata as Record<string, unknown> | null)?.note === "string" ? ((event.metadata as Record<string, string>).note) : null,
    })),
  };
}
