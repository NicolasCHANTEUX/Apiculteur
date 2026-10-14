import "server-only";

import { requireAdmin } from "@/data/auth";
import { orderState, type FulfillmentStatus, type OrderStateKey, type ValidationStatus } from "@/lib/orders/labels";
import { isRequestKind, type RequestKind, type RequestStatus } from "@/lib/requests/form";
import type { ReviewStatus } from "@/lib/reviews/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Fiches clients (CAHIER §17.6). Un client = une adresse email, créé à sa
// première demande de commande.

export const CUSTOMERS_PER_PAGE = 30;

export function isAnonymized(email: string) {
  return /^anonyme-[0-9a-f]{32}@anonymise\.invalid$/.test(email);
}

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  createdAt: string;
  orders: number;
  /** Total des commandes acceptées (hors refus et annulations). */
  spent: number;
  lastOrderAt: string | null;
  anonymized: boolean;
};

type ListRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  created_at: string;
  orders: { total_amount: number | string; created_at: string; validation_status: ValidationStatus; fulfillment_status: FulfillmentStatus }[] | null;
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function listAdminCustomers({ q, page }: { q: string; page: number }) {
  await requireAdmin("/admin/clients");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, city, created_at, orders(total_amount, created_at, validation_status, fulfillment_status)")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Clients: ${error.message}`);

  const rows: AdminCustomerRow[] = ((data ?? []) as unknown as ListRow[]).map((row) => {
    const orders = row.orders ?? [];
    const kept = orders.filter((order) => {
      const state = orderState(order.validation_status, order.fulfillment_status).key;
      return state !== "refused" && state !== "cancelled";
    });
    const last = orders.map((order) => order.created_at).sort().at(-1) ?? null;
    return {
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      createdAt: row.created_at,
      orders: orders.length,
      spent: kept.reduce((sum, order) => sum + Number(order.total_amount), 0),
      lastOrderAt: last,
      anonymized: isAnonymized(row.email),
    };
  });
  // Clients récents en premier : dernière commande, sinon création.
  rows.sort((a, b) => (b.lastOrderAt ?? b.createdAt).localeCompare(a.lastOrderAt ?? a.createdAt));

  const words = normalize(q).split(/\s+/).filter(Boolean);
  const found = words.length
    ? rows.filter((row) => {
        const haystack = normalize(`${row.name} ${row.email} ${row.phone ?? ""} ${row.city ?? ""}`);
        return words.every((word) => haystack.includes(word));
      })
    : rows;
  const pages = Math.max(1, Math.ceil(found.length / CUSTOMERS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pages);
  return { customers: found.slice((current - 1) * CUSTOMERS_PER_PAGE, current * CUSTOMERS_PER_PAGE), total: found.length, page: current, pages };
}

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  anonymized: boolean;
  orders: { id: string; number: string; createdAt: string; total: number; state: { key: OrderStateKey; label: string }; termsVersion: number | null }[];
  requests: { id: string; reference: string; kind: RequestKind; status: RequestStatus; subject: string; createdAt: string; trashed: boolean }[];
  reviews: { id: string; rating: number; status: ReviewStatus; comment: string | null; createdAt: string }[];
};

export async function getAdminCustomer(id: string): Promise<AdminCustomer | null> {
  await requireAdmin(`/admin/clients/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: customer, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Client: ${error.message}`);
  if (!customer) return null;
  const email = customer.email as string;

  const [orders, requests] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, created_at, total_amount, validation_status, fulfillment_status, terms_version")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_requests")
      .select("id, reference, kind, status, subject, created_at, deleted_at")
      .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
      .order("created_at", { ascending: false }),
  ]);
  if (orders.error) throw new Error(`Commandes du client: ${orders.error.message}`);
  if (requests.error && requests.error.code !== "PGRST205") console.error("Demandes du client", requests.error.message);

  // La commande d'un avis n'est pas lisible avec la session (colonne
  // protégée) : lecture avec la clé serveur, droits vérifiés ci-dessus.
  const orderIds = (orders.data ?? []).map((order) => order.id as string);
  const reviews = orderIds.length
    ? await createAdminClient().from("reviews").select("id, rating, status, comment, created_at").in("order_id", orderIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (reviews.error) console.error("Avis du client", reviews.error.message);

  const address = [customer.address_line1, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return {
    id,
    name: customer.full_name as string,
    email,
    phone: (customer.phone as string | null) ?? null,
    address: address || null,
    internalNote: (customer.internal_note as string | null) ?? null,
    createdAt: customer.created_at as string,
    updatedAt: customer.updated_at as string,
    anonymized: isAnonymized(email),
    orders: (orders.data ?? []).map((order) => ({
      id: order.id as string,
      number: order.order_number as string,
      createdAt: order.created_at as string,
      total: Number(order.total_amount),
      state: orderState(order.validation_status as ValidationStatus, order.fulfillment_status as FulfillmentStatus),
      termsVersion: (order.terms_version as number | null) ?? null,
    })),
    requests: (requests.data ?? []).map((request) => ({
      id: request.id as string,
      reference: request.reference as string,
      kind: isRequestKind(String(request.kind)) ? (request.kind as RequestKind) : "contact",
      status: request.status as RequestStatus,
      subject: request.subject as string,
      createdAt: request.created_at as string,
      trashed: request.deleted_at !== null,
    })),
    reviews: (reviews.data ?? []).map((review) => ({
      id: review.id as string,
      rating: review.rating as number,
      status: review.status as ReviewStatus,
      comment: (review.comment as string | null) ?? null,
      createdAt: review.created_at as string,
    })),
  };
}

/**
 * Toutes les données d'un client, pour son droit d'accès et de portabilité
 * (CAHIER §19) : fiche, commandes et lignes, demandes, avis.
 */
export async function exportCustomerData(id: string) {
  await requireAdmin(`/admin/clients/${id}`);
  const admin = createAdminClient();
  const { data: customer, error } = await admin
    .from("customers")
    .select("full_name, email, phone, address_line1, address_line2, postal_code, city, country, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Export client: ${error.message}`);
  if (!customer) return null;
  const [orders, requests] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id, order_number, created_at, contact_name, contact_email, contact_phone, company_name, professional_id, delivery_method, delivery_address_line1, delivery_postal_code, delivery_city, requested_date, customer_message, subtotal, delivery_fee, total_amount, validation_status, fulfillment_status, payment_status, payment_method, terms_version, order_items(product_name_snapshot, unit_price, quantity, line_total)",
      )
      .eq("customer_id", id)
      .order("created_at"),
    admin
      .from("contact_requests")
      .select("reference, kind, subject, message, details, phone, product_name, consent_at, created_at")
      .ilike("email", (customer.email as string).replace(/[%_\\]/g, "\\$&"))
      .order("created_at"),
  ]);
  const orderIds = (orders.data ?? []).map((order) => order.id as string);
  const reviews = orderIds.length
    ? await admin.from("reviews").select("customer_name, rating, comment, customer_consent, submitted_at").in("order_id", orderIds)
    : { data: [] };
  return {
    exportedAt: new Date().toISOString(),
    customer,
    // Identifiants internes retirés : seules les données du client sont exportées.
    orders: (orders.data ?? []).map((order) => Object.fromEntries(Object.entries(order).filter(([key]) => key !== "id"))),
    contactRequests: requests.data ?? [],
    reviews: reviews.data ?? [],
  };
}
