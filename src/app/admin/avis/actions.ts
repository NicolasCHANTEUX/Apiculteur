"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { processDueReviewInvitations } from "@/data/review-invitations";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { ANONYMOUS_NAME, isReviewStatus, parseReviewDelay, reviewDelayChoices } from "@/lib/reviews/form";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFLICT = failure("Cet avis a changé entre-temps (autre onglet ?). La page affiche maintenant sa dernière version.");

function field(formData: FormData, name: string, max = 2000) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function reviewId(formData: FormData) {
  const id = field(formData, "id", 40);
  return UUID.test(id) ? id : null;
}

// Un avis publié apparaît sur l'accueil, la page Avis, le catalogue et sa fiche.
function revalidateReviews() {
  revalidatePath("/", "layout");
}

async function audit(userId: string, action: string, id: string, metadata: Record<string, unknown> = {}) {
  await recordAudit({ actorUserId: userId, action, entityType: "review", entityId: id, metadata });
}

/** Modifie un avis si son état n'a pas changé depuis l'affichage (`from`). */
async function updateReview(id: string, from: string, values: Record<string, unknown>) {
  const supabase = await createClient();
  const query = supabase.from("reviews").update(values).eq("id", id);
  const { data, error } = await (isReviewStatus(from) ? query.eq("status", from) : query).select("customer_name");
  if (error) console.error("Avis : mise à jour", error.code, error.message);
  return { updated: data?.[0] as { customer_name: string } | undefined, error };
}

// Avis clients visibles ou non sur le site : page Avis, lien du menu,
// section de l'accueil, notes du catalogue et des fiches produit.
export async function setReviewsPublicAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const visible = formData.get("value") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "reviews_public", value: visible, description: "Avis clients visibles sur le site (true/false)." });
  if (error) {
    console.error("Réglage reviews_public", error.code, error.message);
    return failure("Le réglage n’a pas pu être enregistré.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "settings.reviews_public", entityType: "settings", entityId: null, metadata: { visible } });
  // Tout le site : le menu figure sur chaque page, y compris les pages statiques.
  revalidateReviews();
  return success(visible ? "Les avis sont maintenant visibles sur le site." : "Les avis sont masqués sur le site.");
}

/** Publier, masquer, refuser (gardé dans l'historique) ou remettre à modérer. */
export async function setReviewStatusAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const id = reviewId(formData);
  const status = field(formData, "status", 20);
  if (!id || !isReviewStatus(status)) return failure("Action invalide.");
  const { updated, error } = await updateReview(id, field(formData, "from", 20), { status });
  revalidatePath("/admin/avis");
  if (error) return failure("Le changement n’a pas pu être enregistré.");
  if (!updated) return CONFLICT;
  await audit(admin.userId, "review.status_changed", id, { status, name: updated.customer_name });
  revalidateReviews();
  const messages = {
    displayed: "Avis publié.",
    hidden: "Avis masqué : il n’apparaît plus sur le site.",
    refused: "Avis refusé : il reste dans l’historique, sans jamais être publié.",
    pending: "Avis remis à modérer.",
  } as const;
  return success(messages[status]);
}

/** Réponse publique de l'apiculteur, affichée sous l'avis. Vide : retirée. */
export async function saveReviewReplyAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const id = reviewId(formData);
  if (!id) return failure("Avis invalide.");
  const reply = field(formData, "reply").replace(/\r\n/g, "\n");
  const { updated, error } = await updateReview(id, "", { admin_reply: reply || null });
  if (error || !updated) return failure("La réponse n’a pas pu être enregistrée.");
  await audit(admin.userId, "review.replied", id, { name: updated.customer_name, removed: !reply });
  revalidatePath("/admin/avis");
  revalidateReviews();
  return success(reply ? "Réponse enregistrée : elle s’affiche sous l’avis." : "Réponse retirée.");
}

export async function setReviewFeaturedAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const id = reviewId(formData);
  if (!id) return failure("Avis invalide.");
  const featured = formData.get("featured") === "true";
  const { updated, error } = await updateReview(id, "", { featured });
  if (error || !updated) return failure("Le changement n’a pas pu être enregistré.");
  await audit(admin.userId, "review.featured", id, { featured, name: updated.customer_name });
  revalidatePath("/admin/avis");
  revalidateReviews();
  return success(featured ? "Avis mis en avant : il passe en tête sur le site." : "Avis retiré de la mise en avant.");
}

/** Remplace le nom affiché par « Client vérifié » (à la demande du client). */
export async function anonymizeReviewAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const id = reviewId(formData);
  if (!id) return failure("Avis invalide.");
  const { updated, error } = await updateReview(id, "", { customer_name: ANONYMOUS_NAME });
  if (error || !updated) return failure("L’anonymisation n’a pas pu être enregistrée.");
  await audit(admin.userId, "review.anonymized", id);
  revalidatePath("/admin/avis");
  revalidateReviews();
  return success(`Avis anonymisé : il s’affiche désormais sous « ${ANONYMOUS_NAME} ».`);
}

export async function setReviewDelayAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const days = parseReviewDelay(formData.get("value"));
  if (!(reviewDelayChoices as readonly number[]).includes(days)) return failure("Délai invalide.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({
    key: "review_request_delay_days",
    value: days,
    description: "Delai (jours) apres le retrait ou la livraison avant la demande d'avis ; 0 : pas de demande automatique.",
  });
  if (error) {
    console.error("Réglage review_request_delay_days", error.code, error.message);
    return failure("Le réglage n’a pas pu être enregistré.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "settings.review_delay", entityType: "settings", entityId: null, metadata: { days } });
  revalidatePath("/admin/avis");
  return success(days ? `Demande d’avis envoyée ${days} jours après le retrait ou la livraison.` : "Plus de demande d’avis automatique.");
}

/** Envoie tout de suite les demandes d'avis arrivées à échéance. */
export async function sendDueReviewRequestsAction(): Promise<ActionResult> {
  await requireAdmin("/admin/avis");
  let result;
  try {
    result = await processDueReviewInvitations();
  } catch (error) {
    console.error("Demandes d'avis", error instanceof Error ? error.message : error);
    return failure("Les demandes d’avis n’ont pas pu être préparées. Réessayez.");
  }
  revalidatePath("/admin/avis");
  revalidatePath("/admin/emails");
  revalidatePath("/admin", "layout");
  const { queued, failed } = result.summary;
  if (!queued && !failed) return success("Aucune demande d’avis à envoyer pour le moment.");
  const auto = Boolean(getEmailConfig().provider);
  const done = queued
    ? `${queued} demande${queued > 1 ? "s" : ""} d’avis ${auto ? `envoyée${queued > 1 ? "s" : ""}` : `prête${queued > 1 ? "s" : ""} dans la rubrique Emails`}.`
    : "";
  return failed ? failure(`${done} ${failed} n’ont pas pu partir : réessayez.`.trim()) : success(done);
}

