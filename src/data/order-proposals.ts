import "server-only";

import type { OrderEmailExtra } from "@/data/email";
import { getDeliverySettings } from "@/data/settings";
import { pickupAddress } from "@/lib/delivery/settings";
import { eurosToCents } from "@/lib/domain/pricing";
import { PROPOSAL_LINK_DAYS } from "@/lib/orders/admin-lines";
import { hashLinkToken, isLinkTokenShape } from "@/lib/security/link-token";
import { createAdminClient } from "@/lib/supabase/admin";

// Propositions de modification d'une demande (fin du lot 5, CAHIER §8.2).
// Le client répond par un lien personnel (H6) ; seule l'empreinte du jeton
// est en base, la lecture se fait avec la clé serveur.

export type ProposalLine = { name: string; quantity: number; unitPrice: number; lineTotal: number };

/** Demande ou proposition : lignes, réception, date et montants. */
export type ProposalTerms = {
  lines: ProposalLine[];
  deliveryMethod: "pickup" | "delivery";
  requestedDate: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

type RawTerms = {
  items?: { name?: string; quantity?: number; unit_price?: number | string; line_total?: number | string }[];
  delivery_method?: string;
  requested_date?: string | null;
  subtotal?: number | string;
  delivery_fee?: number | string;
  total_amount?: number | string;
};

/** Lignes et montants enregistrés en JSON (proposition ou demande d'origine). */
export function readTerms(raw: RawTerms | null | undefined): ProposalTerms {
  return {
    lines: (raw?.items ?? []).map((item) => ({
      name: item.name ?? "Produit",
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      lineTotal: Number(item.line_total ?? 0),
    })),
    deliveryMethod: raw?.delivery_method === "delivery" ? "delivery" : "pickup",
    requestedDate: raw?.requested_date ?? null,
    subtotal: Number(raw?.subtotal ?? 0),
    deliveryFee: Number(raw?.delivery_fee ?? 0),
    total: Number(raw?.total_amount ?? 0),
  };
}

/** Contenu de l'email de proposition : lignes proposées à la place de la demande. */
export function proposalEmailExtra(terms: ProposalTerms, link: string | null): OrderEmailExtra {
  return {
    lines: terms.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: eurosToCents(line.unitPrice),
      lineTotalCents: eurosToCents(line.lineTotal),
    })),
    totalCents: eurosToCents(terms.total),
    deliveryMethod: terms.deliveryMethod,
    requestedDate: terms.requestedDate,
    deliveryFeeCents: eurosToCents(terms.deliveryFee),
    link,
    linkDays: PROPOSAL_LINK_DAYS,
  };
}

export type ProposalView =
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "answered"; accepted: boolean }
  | { state: "withdrawn" }
  | {
      state: "ok";
      orderNumber: string;
      orderDate: string;
      customerName: string;
      message: string | null;
      proposed: ProposalTerms;
      previous: ProposalTerms;
      /** Adresse de livraison de la demande, s'il y en a une. */
      address: string | null;
      /** Adresse de retrait publique (sinon communiquée à la confirmation). */
      pickupAddress: string | null;
      expiresAt: string;
    };

type ProposalRow = RawTerms & {
  status: "pending" | "accepted" | "declined" | "withdrawn";
  message: string | null;
  previous: RawTerms | null;
  expires_at: string;
  orders: {
    order_number: string;
    created_at: string;
    contact_name: string | null;
    delivery_address_line1: string | null;
    delivery_postal_code: string | null;
    delivery_city: string | null;
    customers: { full_name: string } | null;
  } | null;
};

/** Lecture d'un lien reçu par email (page de réponse), avec la clé serveur. */
export async function getProposalForToken(token: string): Promise<ProposalView> {
  if (!isLinkTokenShape(token)) return { state: "invalid" };
  const { data, error } = await createAdminClient()
    .from("order_proposals")
    .select(
      "status, items, delivery_method, requested_date, subtotal, delivery_fee, total_amount, message, previous, expires_at, orders(order_number, created_at, contact_name, delivery_address_line1, delivery_postal_code, delivery_city, customers(full_name))",
    )
    .eq("token_hash", hashLinkToken(token))
    .maybeSingle<ProposalRow>();
  if (error) throw new Error(`Lien de proposition : ${error.message}`);
  if (!data?.orders) return { state: "invalid" };
  if (data.status === "withdrawn") return { state: "withdrawn" };
  if (data.status !== "pending") return { state: "answered", accepted: data.status === "accepted" };
  if (Date.parse(data.expires_at) < Date.now()) return { state: "expired" };

  const order = data.orders;
  const proposed = readTerms(data);
  const delivery = await getDeliverySettings();
  return {
    state: "ok",
    orderNumber: order.order_number,
    orderDate: order.created_at,
    customerName: order.contact_name ?? order.customers?.full_name ?? "",
    message: data.message,
    proposed,
    previous: readTerms(data.previous),
    address: [order.delivery_address_line1, [order.delivery_postal_code, order.delivery_city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    pickupAddress: pickupAddress(delivery, "site"),
    expiresAt: data.expires_at,
  };
}
