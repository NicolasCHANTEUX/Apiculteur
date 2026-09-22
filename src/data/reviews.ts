import "server-only";

import { cache } from "react";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type PublicReview = {
  id: string;
  productId: string | null;
  customerName: string;
  rating: number;
  comment: string | null;
  adminReply: string | null;
  featured: boolean;
  submittedAt: string | null;
  createdAt: string;
};

export type ReviewsResult =
  | { kind: "unconfigured" }
  | { kind: "ready"; reviews: PublicReview[] };

type ReviewRow = {
  id: string;
  product_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  featured: boolean;
  submitted_at: string | null;
  created_at: string;
};

// Avis affiches publiquement (deja modere + consentement client), via la
// vue public_reviews qui n'expose ni access_token ni order_id.
// Cf. supabase/migrations/20260922100000_harden_public_reads.sql.
export const getPublicReviews = cache(async (): Promise<ReviewsResult> => {
  if (!getPublicSupabaseConfig()) {
    return { kind: "unconfigured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_reviews")
    .select(
      "id, product_id, customer_name, rating, comment, admin_reply, featured, submitted_at, created_at",
    )
    .order("featured", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(9);

  if (error) {
    throw new Error(`Lecture des avis impossible: ${error.message}`);
  }

  const rows = (data ?? []) as ReviewRow[];

  return {
    kind: "ready",
    reviews: rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      customerName: row.customer_name,
      rating: row.rating,
      comment: row.comment,
      adminReply: row.admin_reply,
      featured: row.featured,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
    })),
  };
});
