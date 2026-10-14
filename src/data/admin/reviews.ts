import "server-only";

import { requireAdmin } from "@/data/auth";
import type { ReviewStatus } from "@/lib/reviews/form";
import { createClient } from "@/lib/supabase/server";

export const reviewTabs = {
  "a-moderer": "À modérer",
  publies: "Publiés",
  masques: "Masqués",
  refuses: "Refusés",
  tous: "Tous",
} as const;

export type ReviewTab = keyof typeof reviewTabs;

const tabStatus: Record<ReviewTab, ReviewStatus | null> = {
  "a-moderer": "pending",
  publies: "displayed",
  masques: "hidden",
  refuses: "refused",
  tous: null,
};

export function isReviewTab(value: string): value is ReviewTab {
  return Object.hasOwn(reviewTabs, value);
}

export function reviewsInTab<T extends { status: ReviewStatus }>(reviews: T[], tab: ReviewTab) {
  const status = tabStatus[tab];
  return status ? reviews.filter((review) => review.status === status) : reviews;
}

export type AdminReview = {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  adminReply: string | null;
  status: ReviewStatus;
  featured: boolean;
  consent: boolean;
  productName: string | null;
  productId: string | null;
  submittedAt: string | null;
  createdAt: string;
  order: { id: string; number: string } | null;
};

type Row = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  status: ReviewStatus;
  featured: boolean;
  customer_consent: boolean;
  product_id: string | null;
  submitted_at: string | null;
  created_at: string;
  products: { name: string } | null;
};

type InvitationRow = {
  order_id: string;
  send_after: string;
  sent_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  review_id: string | null;
  orders: { order_number: string } | null;
};

export type InvitationStats = {
  /** Migration du lot 8 appliquée. */
  available: boolean;
  scheduled: number;
  /** Échéance passée, pas encore envoyées. */
  due: number;
  waiting: number;
  received: number;
};

// Avis vus par l'admin. Ni le jeton du lien, ni la commande (colonnes non
// lisibles) : la commande d'un avis est retrouvée par sa demande d'avis.
export async function listAdminReviews() {
  await requireAdmin("/admin/avis");
  const supabase = await createClient();
  const [reviewsResult, invitationsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, customer_name, rating, comment, admin_reply, status, featured, customer_consent, product_id, submitted_at, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("review_invitations")
      .select("order_id, send_after, sent_at, expires_at, used_at, review_id, orders(order_number)")
      .limit(2000),
  ]);
  if (reviewsResult.error) throw new Error(`Avis: ${reviewsResult.error.message}`);

  const invitations = invitationsResult.error ? [] : ((invitationsResult.data ?? []) as unknown as InvitationRow[]);
  if (invitationsResult.error && invitationsResult.error.code !== "PGRST205" && invitationsResult.error.code !== "42P01") {
    console.error("Demandes d'avis", invitationsResult.error.code, invitationsResult.error.message);
  }
  const orderByReview = new Map(
    invitations
      .filter((row) => row.review_id && row.orders)
      .map((row) => [row.review_id as string, { id: row.order_id, number: row.orders!.order_number }]),
  );

  const all: AdminReview[] = ((reviewsResult.data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment,
    adminReply: row.admin_reply,
    status: row.status,
    featured: row.featured,
    consent: row.customer_consent,
    productName: row.products?.name ?? null,
    productId: row.product_id,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    order: orderByReview.get(row.id) ?? null,
  }));

  const counts = Object.fromEntries(
    (Object.keys(reviewTabs) as ReviewTab[]).map((value) => {
      const status = tabStatus[value];
      return [value, status ? all.filter((review) => review.status === status).length : all.length];
    }),
  ) as Record<ReviewTab, number>;
  // Ce que voient les visiteurs quand les avis sont affichés.
  const published = all.filter((review) => review.status === "displayed" && review.consent);
  const now = Date.now();
  const stats: InvitationStats = {
    available: !invitationsResult.error,
    scheduled: invitations.filter((row) => !row.sent_at).length,
    due: invitations.filter((row) => !row.sent_at && Date.parse(row.send_after) <= now).length,
    waiting: invitations.filter((row) => row.sent_at && !row.used_at && row.expires_at && Date.parse(row.expires_at) > now).length,
    received: invitations.filter((row) => row.used_at).length,
  };
  return {
    reviews: all,
    counts,
    published: published.length,
    pending: counts["a-moderer"],
    average: published.length ? published.reduce((sum, review) => sum + review.rating, 0) / published.length : null,
    invitations: stats,
  };
}

export type OrderReview = {
  invitation: { sendAfter: string; sentAt: string | null; expiresAt: string | null; usedAt: string | null } | null;
  review: { id: string; rating: number; status: ReviewStatus; customerName: string } | null;
};

/** Demande d'avis et avis reçu pour une commande (fiche commande). */
export async function getOrderReview(orderId: string): Promise<OrderReview> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("review_invitations")
    .select("send_after, sent_at, expires_at, used_at, review_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) {
    if (error.code !== "PGRST205" && error.code !== "42P01") console.error("Demande d'avis de la commande", error.code, error.message);
    return { invitation: null, review: null };
  }
  if (!data) return { invitation: null, review: null };
  let review: OrderReview["review"] = null;
  if (data.review_id) {
    const { data: row } = await supabase.from("reviews").select("id, rating, status, customer_name").eq("id", data.review_id).maybeSingle();
    if (row) review = { id: row.id as string, rating: row.rating as number, status: row.status as ReviewStatus, customerName: row.customer_name as string };
  }
  return {
    invitation: { sendAfter: data.send_after as string, sentAt: data.sent_at as string | null, expiresAt: data.expires_at as string | null, usedAt: data.used_at as string | null },
    review,
  };
}

/** Avis à modérer (badge de la navigation). Zéro en cas d'erreur. */
export async function countPendingReviews(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (error) {
    console.error("Avis à modérer", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}
