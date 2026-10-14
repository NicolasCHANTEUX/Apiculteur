import "server-only";

import { requireAdmin } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewStatus = "pending" | "displayed" | "hidden" | "refused";

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "En attente",
  displayed: "Affiché",
  hidden: "Masqué",
  refused: "Refusé",
};

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

// Avis vus par l'admin (lecture seule pour l'instant ; la modération
// arrive avec le lot 8). Ni jeton d'accès ni commande ne sont lisibles.
export async function listAdminReviews() {
  await requireAdmin("/admin/avis");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, comment, admin_reply, status, featured, customer_consent, product_id, submitted_at, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Avis: ${error.message}`);
  const reviews: AdminReview[] = ((data ?? []) as unknown as Row[]).map((row) => ({
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
  }));
  // Ce que voient les visiteurs quand les avis sont affichés.
  const published = reviews.filter((review) => review.status === "displayed" && review.consent);
  return {
    reviews,
    published: published.length,
    pending: reviews.filter((review) => review.status === "pending").length,
    average: published.length ? published.reduce((sum, review) => sum + review.rating, 0) / published.length : null,
  };
}
