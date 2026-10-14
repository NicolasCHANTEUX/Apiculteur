import "server-only";

import { deliverEmails, queueReviewEmails } from "@/data/email";
import { getReviewSettings } from "@/data/settings";
import { defaultDisplayName } from "@/lib/reviews/form";
import { REVIEW_LINK_DAYS, createReviewToken, hashReviewToken, isReviewTokenShape } from "@/lib/reviews/token";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

// Demandes d'avis (ROADMAP lot 8, CAHIER §13). Une invitation par commande
// retirée ou livrée ; le lien part après le délai réglé, par la tâche
// quotidienne ou à la demande de l'admin. Écritures avec la clé serveur.

const DAY = 86_400_000;

/** Programme la demande d'avis d'une commande terminée (si le délai n'est pas « désactivé »). */
export async function scheduleReviewInvitation(orderId: string): Promise<"scheduled" | "disabled" | "exists" | "failed"> {
  const { delayDays } = await getReviewSettings();
  if (delayDays === 0) return "disabled";
  const { data, error } = await createAdminClient()
    .from("review_invitations")
    .upsert({ order_id: orderId, send_after: new Date(Date.now() + delayDays * DAY).toISOString() }, { onConflict: "order_id", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("Demande d'avis : programmation", error.code, error.message);
    return "failed";
  }
  return data?.length ? "scheduled" : "exists";
}

export type InvitationSend = "queued" | "already" | "used" | "no-email" | "ineligible" | "failed";

type EligibleOrder = {
  id: string;
  fulfillment_status: string;
  validation_status: string;
  contact_email: string | null;
  customers: { email: string } | null;
};

/**
 * Envoie le lien de dépôt d'une commande : nouveau jeton (l'ancien lien ne
 * marche plus), valable 30 jours, email mis en file. `resend` : renvoie un
 * lien déjà envoyé mais pas encore utilisé. Renvoie les emails à livrer.
 */
export async function sendReviewInvitation(
  orderId: string,
  { resend = false, siteUrl }: { resend?: boolean; siteUrl?: string } = {},
): Promise<{ status: InvitationSend; emailIds: string[] }> {
  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, fulfillment_status, validation_status, contact_email, customers(email)")
    .eq("id", orderId)
    .maybeSingle<EligibleOrder>();
  if (orderError) {
    console.error("Demande d'avis : commande", orderError.code, orderError.message);
    return { status: "failed", emailIds: [] };
  }
  if (!order || order.fulfillment_status !== "delivered" || order.validation_status === "refused") return { status: "ineligible", emailIds: [] };
  if (!(order.contact_email ?? order.customers?.email)) return { status: "no-email", emailIds: [] };

  // L'invitation existe si la commande a été terminée avec un délai actif ;
  // sinon (demande manuelle), elle est créée maintenant.
  await supabase.from("review_invitations").upsert({ order_id: orderId, send_after: new Date().toISOString() }, { onConflict: "order_id", ignoreDuplicates: true });

  const { token, hash } = createReviewToken();
  const now = new Date();
  let claim = supabase
    .from("review_invitations")
    .update({ token_hash: hash, sent_at: now.toISOString(), expires_at: new Date(now.getTime() + REVIEW_LINK_DAYS * DAY).toISOString() })
    .eq("order_id", orderId)
    .is("used_at", null);
  if (!resend) claim = claim.is("sent_at", null);
  const { data: claimed, error: claimError } = await claim.select("id, sent_at");
  if (claimError) {
    console.error("Demande d'avis : prise en charge", claimError.code, claimError.message);
    return { status: "failed", emailIds: [] };
  }
  if (!claimed?.length) {
    const { data: current } = await supabase.from("review_invitations").select("used_at").eq("order_id", orderId).maybeSingle();
    return { status: current?.used_at ? "used" : "already", emailIds: [] };
  }

  try {
    const base = siteUrl ?? (await getSiteUrl());
    const emailIds = await queueReviewEmails(orderId, ["review_request"], {
      link: `${base}/mon-avis/${token}`,
      linkDays: REVIEW_LINK_DAYS,
      dedupeSuffix: hash.slice(0, 16),
      siteUrl: base,
    });
    return { status: "queued", emailIds };
  } catch (error) {
    // L'email n'a pas pu être préparé : l'invitation redevient à envoyer.
    console.error("Demande d'avis : email", error instanceof Error ? error.message : error);
    await supabase.from("review_invitations").update({ token_hash: null, sent_at: null, expires_at: null }).eq("order_id", orderId).eq("token_hash", hash);
    return { status: "failed", emailIds: [] };
  }
}

/** Demandes arrivées à échéance : liens envoyés et emails livrés. */
export async function processDueReviewInvitations({ limit = 25, siteUrl }: { limit?: number; siteUrl?: string } = {}) {
  const { data, error } = await createAdminClient()
    .from("review_invitations")
    .select("order_id")
    .is("sent_at", null)
    .is("used_at", null)
    .lte("send_after", new Date().toISOString())
    .order("send_after")
    .limit(limit);
  if (error) throw new Error(`Demandes d'avis : ${error.message}`);

  const summary: Record<InvitationSend, number> = { queued: 0, already: 0, used: 0, "no-email": 0, ineligible: 0, failed: 0 };
  const emailIds: string[] = [];
  for (const row of data ?? []) {
    const orderId = row.order_id as string;
    const result = await sendReviewInvitation(orderId, { siteUrl });
    summary[result.status] += 1;
    emailIds.push(...result.emailIds);
    // Commande sans email ou plus éligible : l'invitation est retirée pour
    // ne pas être retentée chaque jour.
    if (result.status === "no-email" || result.status === "ineligible") {
      await createAdminClient().from("review_invitations").delete().eq("order_id", orderId).is("sent_at", null);
    }
  }
  const delivered = await deliverEmails(emailIds, { retryFailed: false });
  return { due: data?.length ?? 0, summary, sent: delivered.filter((result) => result.status === "sent").length };
}

export type InvitationView =
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "used" }
  | {
      state: "ok";
      orderNumber: string;
      orderDate: string;
      customerName: string;
      suggestedName: string;
      products: { name: string; quantity: number }[];
      expiresAt: string;
    };

type InvitationRow = {
  expires_at: string | null;
  used_at: string | null;
  orders: {
    order_number: string;
    created_at: string;
    contact_name: string | null;
    customers: { full_name: string } | null;
    order_items: { product_name_snapshot: string; quantity: number }[] | null;
  } | null;
};

/** Lecture d'un lien reçu par email (page de dépôt), avec la clé serveur. */
export async function getInvitationForToken(token: string): Promise<InvitationView> {
  if (!isReviewTokenShape(token)) return { state: "invalid" };
  const { data, error } = await createAdminClient()
    .from("review_invitations")
    .select("expires_at, used_at, orders(order_number, created_at, contact_name, customers(full_name), order_items(product_name_snapshot, quantity))")
    .eq("token_hash", hashReviewToken(token))
    .maybeSingle<InvitationRow>();
  if (error) throw new Error(`Lien d'avis : ${error.message}`);
  if (!data?.orders) return { state: "invalid" };
  if (data.used_at) return { state: "used" };
  if (!data.expires_at || Date.parse(data.expires_at) < Date.now()) return { state: "expired" };
  const customerName = data.orders.contact_name ?? data.orders.customers?.full_name ?? "";
  return {
    state: "ok",
    orderNumber: data.orders.order_number,
    orderDate: data.orders.created_at,
    customerName,
    suggestedName: defaultDisplayName(customerName),
    products: (data.orders.order_items ?? []).map((item) => ({ name: item.product_name_snapshot, quantity: item.quantity })),
    expiresAt: data.expires_at,
  };
}
