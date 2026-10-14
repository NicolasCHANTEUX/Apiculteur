"use server";

import { redirect } from "next/navigation";
import { scheduleReviewEmails } from "@/data/email";
import { parseReviewForm } from "@/lib/reviews/form";
import { hashReviewToken, isReviewTokenShape } from "@/lib/reviews/token";
import { RateLimitError, currentClientIp, enforceRateLimit } from "@/lib/security/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewFormState = { status: "idle" | "error"; message: string; errors: Record<string, string> };

const UNAVAILABLE = "L’envoi est momentanément impossible. Réessayez dans un instant.";

function failure(message: string, errors: Record<string, string> = {}): ReviewFormState {
  return { status: "error", message, errors };
}

// Dépôt d'un avis par le lien personnel reçu par email (CAHIER §13). Le
// jeton n'est vérifié que par la base (fonction submit_review, clé serveur).
export async function submitReviewAction(_previous: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !isReviewTokenShape(token)) return failure("Ce lien n’est pas valide.");
  const parsed = parseReviewForm(formData);
  if (!parsed.ok) return failure("Certains champs sont à corriger.", parsed.errors);
  const review = parsed.value;

  try {
    await enforceRateLimit({ scope: "review-submit-ip", identifier: await currentClientIp(), limit: 10, windowSeconds: 3600 });
  } catch (error) {
    if (error instanceof RateLimitError) return failure("Trop d’essais : patientez un peu avant de réessayer.");
    console.error("Avis : limitation indisponible", error);
    return failure(UNAVAILABLE);
  }

  const { data, error } = await createAdminClient()
    .rpc("submit_review", {
      p_token_hash: hashReviewToken(token),
      p_rating: review.rating,
      p_comment: review.comment,
      p_display_name: review.displayName,
      p_consent: review.consent,
    })
    .single<{ review_id: string; order_id: string; order_number: string }>();

  if (error) {
    if (error.code === "23505") redirect("/mon-avis/merci?deja=1");
    if (error.code === "P0002") return failure("Ce lien n’est pas valide.");
    if (error.code === "22023" && error.message.includes("expire")) return failure("Ce lien a expiré : écrivez-moi pour en recevoir un nouveau.");
    if (error.code === "22023") return failure("Certains champs sont à corriger.");
    console.error("Avis : dépôt", error.code, error.message);
    return failure(UNAVAILABLE);
  }

  // Alerte pour l'apiculteur et remerciement, après la réponse.
  await scheduleReviewEmails(data.order_id, ["review_new_admin", "review_thanks"], {
    review: { rating: review.rating, comment: review.comment || null, displayName: review.displayName, consent: review.consent },
    dedupeSuffix: data.review_id,
  });
  redirect(`/mon-avis/merci?publication=${review.consent ? "oui" : "non"}`);
}
