"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { listSaleProducts } from "@/data/admin/products";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { deliverEmails, getEmailConfig, scheduleOrderEmails, type OrderEmailTemplate } from "@/data/email";
import { proposalEmailExtra, readTerms } from "@/data/order-proposals";
import { getReviewSettings } from "@/data/settings";
import { scheduleReviewInvitation, sendReviewInvitation } from "@/data/review-invitations";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { parisDay } from "@/lib/admin/series";
import { centsToDecimal, parseEurosToCents } from "@/lib/catalog/product-form";
import { eurosToCents } from "@/lib/domain/pricing";
import { PROPOSAL_LINK_DAYS, linesPayload, parseLines, parseManualSale, parseProposal } from "@/lib/orders/admin-lines";
import { createLinkToken } from "@/lib/security/link-token";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFLICT = failure("Cette commande a changé entre-temps (autre onglet ?). La page affiche maintenant sa dernière version.");

function field(formData: FormData, name: string, max = 2000) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Email au client pour cette étape, si l'admin l'a demandé (case cochée par
 * défaut). Renvoie la phrase à ajouter au message de confirmation.
 */
async function notifyCustomer(formData: FormData, id: string, template: OrderEmailTemplate, note?: string) {
  if (formData.get("notify") !== "true") return "";
  const queued = await scheduleOrderEmails(id, [template], { note, queueNow: true });
  if (queued === "failed") return " L’email au client n’a pas pu être préparé : prévenez-le depuis « Écrire au client ».";
  if (!queued) return " Aucun nouvel email : déjà prévu pour cette étape, ou client sans adresse.";
  revalidatePath("/admin/emails");
  return getEmailConfig().provider ? " Le client est prévenu par email." : " Email prêt à envoyer depuis la rubrique Emails.";
}

function revalidateOrder(id: string) {
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/admin");
  // Le stock change à l'acceptation et à l'annulation.
  revalidatePath("/admin/produits");
  revalidatePath("/catalogue");
}

function rpcFailure(error: { code?: string; message: string }): ActionResult {
  if (error.code === "40001") return CONFLICT;
  if (error.code === "55000") return failure("Cette commande a déjà été traitée.");
  if (error.code === "P0001" && error.message.startsWith("Stock insuffisant")) {
    return failure(`${error.message.replace("Stock insuffisant :", "Stock insuffisant pour")}. Ajustez le stock du produit ou la commande, puis recommencez.`);
  }
  console.error("Commande", error.code, error.message);
  return failure("L’opération n’a pas pu être enregistrée. Réessayez.");
}

// Acceptation (H3 : le stock des produits vendus en commande directe est
// décompté dans la même transaction).
export async function acceptOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const note = field(formData, "note");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_accept_order", {
    p_order_id: id,
    p_expected_updated_at: field(formData, "version") || null,
    p_note: note,
  });
  if (error) {
    revalidateOrder(id);
    return rpcFailure(error);
  }
  await recordAudit({ actorUserId: admin.userId, action: "order.accepted", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number"), note: note || undefined } });
  const notice = await notifyCustomer(formData, id, "order_accepted", note);
  revalidateOrder(id);
  return success(`Demande acceptée : le stock a été mis à jour.${notice}`);
}

// Refus d'une demande en attente, ou annulation d'une commande acceptée
// (le stock décompté est rendu). La commande reste dans l'historique.
export async function cancelOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const note = field(formData, "note");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_cancel_order", {
    p_order_id: id,
    p_expected_updated_at: field(formData, "version") || null,
    p_note: note,
  });
  if (error) {
    revalidateOrder(id);
    return rpcFailure(error);
  }
  const refused = data === "refused";
  await recordAudit({
    actorUserId: admin.userId,
    action: refused ? "order.refused" : "order.cancelled",
    entityType: "order",
    entityId: id,
    metadata: { order_number: field(formData, "number"), note: note || undefined },
  });
  const notice = await notifyCustomer(formData, id, refused ? "order_refused" : "order_cancelled", note);
  revalidateOrder(id);
  return success(`${refused ? "Demande refusée." : "Commande annulée : le stock a été rendu."}${notice}`);
}

const steps = ["preparing", "ready", "shipped", "delivered"] as const;
const stepMessages = {
  preparing: "Commande remise en préparation.",
  ready: "Commande prête.",
  shipped: "Commande expédiée.",
  delivered: "Commande terminée.",
} as const;

export async function advanceOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  const step = field(formData, "step") as (typeof steps)[number];
  if (!UUID.test(id) || !steps.includes(step)) return failure("Action invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ fulfillment_status: step })
    .eq("id", id)
    .eq("updated_at", field(formData, "version"))
    .in("validation_status", ["accepted", "not_required"])
    .neq("fulfillment_status", "cancelled")
    .select("id");
  if (error) return rpcFailure(error);
  if (!data?.length) {
    revalidateOrder(id);
    return CONFLICT;
  }
  await recordAudit({ actorUserId: admin.userId, action: "order.status_changed", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number"), status: step } });
  let notice =
    step === "ready" ? await notifyCustomer(formData, id, "order_ready") : step === "shipped" ? await notifyCustomer(formData, id, "order_shipped") : "";
  // Commande terminée : la demande d'avis part après le délai réglé.
  if (step === "delivered" && (await scheduleReviewInvitation(id)) === "scheduled") {
    const { delayDays } = await getReviewSettings();
    notice = ` Demande d’avis prévue dans ${delayDays} jour${delayDays > 1 ? "s" : ""}.`;
  }
  revalidateOrder(id);
  return success(`${stepMessages[step]}${notice}`);
}

/**
 * Frais de livraison (estimés à la demande) confirmés ou corrigés par
 * l'apiculteur, tant que la commande n'est ni payée ni terminée.
 */
export async function setDeliveryFeeAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const fee = parseEurosToCents(field(formData, "fee", 20) || "0");
  if (fee === null) return failure("Montant invalide.");

  const supabase = await createClient();
  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("subtotal, payment_status, fulfillment_status, validation_status, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (readError || !order) return failure("Commande introuvable.");
  if (order.payment_status === "paid" || ["delivered", "cancelled"].includes(order.fulfillment_status as string) || order.validation_status === "refused") {
    return failure("Les frais ne se modifient plus une fois la commande payée ou terminée.");
  }
  if (order.validation_status === "proposed") {
    return failure("Une proposition attend la réponse du client : retirez-la avant de modifier les frais.");
  }
  const { data, error } = await supabase
    .from("orders")
    .update({ delivery_fee: centsToDecimal(fee), total_amount: centsToDecimal(eurosToCents(order.subtotal as number | string) + fee) })
    .eq("id", id)
    .eq("updated_at", field(formData, "version"))
    .select("id");
  if (error) return rpcFailure(error);
  if (!data?.length) {
    revalidateOrder(id);
    return CONFLICT;
  }
  await recordAudit({ actorUserId: admin.userId, action: "order.delivery_fee", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number"), fee: centsToDecimal(fee) } });
  revalidateOrder(id);
  return success(fee ? "Frais de livraison enregistrés : le total est mis à jour." : "Livraison à convenir : frais remis à zéro.");
}

export async function markOrderPaidAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const method = field(formData, "method", 60);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", payment_method: method || null })
    .eq("id", id)
    .eq("updated_at", field(formData, "version"))
    .in("validation_status", ["accepted", "not_required"])
    .select("id");
  if (error) return rpcFailure(error);
  if (!data?.length) {
    revalidateOrder(id);
    return CONFLICT;
  }
  await recordAudit({ actorUserId: admin.userId, action: "order.paid", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number"), method: method || undefined } });
  const notice = await notifyCustomer(formData, id, "order_paid");
  revalidateOrder(id);
  return success(`Paiement enregistré.${notice}`);
}

export async function saveOrderNoteAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const note = field(formData, "note");

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ admin_internal_note: note || null }).eq("id", id);
  if (error) return rpcFailure(error);
  await recordAudit({ actorUserId: admin.userId, action: "order.note_updated", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number") } });
  revalidateOrder(id);
  return success("Note enregistrée.");
}

// Interrupteur « demandes en ligne » (fermé par défaut, CAHIER 1.1).
export async function setOrdersOpenAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const open = formData.get("value") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "orders_open", value: open, description: "Reception des demandes de commande depuis le site (true/false)." });
  if (error) {
    console.error("Réglage orders_open", error.code, error.message);
    return failure("Le réglage n’a pas pu être enregistré.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "settings.orders_open", entityType: "settings", entityId: null, metadata: { open } });
  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  revalidatePath("/panier");
  revalidatePath("/commande");
  return success(open ? "Les demandes en ligne sont ouvertes." : "Les demandes en ligne sont fermées.");
}

/** Demande d'avis tout de suite (ou nouveau lien si le précédent n'a pas servi). */
export async function requestReviewAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Commande invalide.");
  const result = await sendReviewInvitation(id, { resend: formData.get("resend") === "true" });
  revalidateOrder(id);
  revalidatePath("/admin/avis");
  revalidatePath("/admin/emails");
  switch (result.status) {
    case "queued": {
      if (result.emailIds.length) after(() => deliverEmails(result.emailIds, { retryFailed: false }).then(() => undefined));
      await recordAudit({ actorUserId: admin.userId, action: "review.request_sent", entityType: "order", entityId: id, metadata: { order_number: field(formData, "number") } });
      return success(getEmailConfig().provider ? "Demande d’avis envoyée au client." : "Demande d’avis prête : envoyez-la depuis le panneau Emails.");
    }
    case "used":
      return failure("Le client a déjà donné son avis pour cette commande.");
    case "already":
      return failure("Une demande d’avis est déjà partie : utilisez « Renvoyer le lien ».");
    case "no-email":
      return failure("Pas d’email pour ce client.");
    case "ineligible":
      return failure("La demande d’avis n’est possible qu’une fois la commande retirée ou livrée.");
    default:
      return failure("La demande d’avis n’a pas pu être préparée. Réessayez.");
  }
}

export type OrderFormState = { status: "idle" | "error"; message: string; errors: Record<string, string> };

function formFailure(message: string, errors: Record<string, string> = {}): OrderFormState {
  return { status: "error", message, errors };
}

const DAY = 86_400_000;

/**
 * Proposition de modification au client (CAHIER §8.2) : quantités, prix,
 * produits, réception et date. Avec un email, le client reçoit un lien pour
 * accepter ou décliner ; sinon l'apiculteur applique la proposition une fois
 * l'accord obtenu (par téléphone).
 */
export async function proposeOrderAction(_previous: OrderFormState, formData: FormData): Promise<OrderFormState> {
  await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  if (!UUID.test(id)) return formFailure("Commande invalide.");

  const supabase = await createClient();
  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("id, validation_status, delivery_postal_code, contact_email, customers(email), order_items(product_id)")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      validation_status: string;
      delivery_postal_code: string | null;
      contact_email: string | null;
      customers: { email: string } | null;
      order_items: { product_id: string }[] | null;
    }>();
  if (readError || !order) return formFailure("Commande introuvable.");
  if (order.validation_status !== "pending") return formFailure("Cette demande n’est plus à valider : rechargez la page.");

  const products = await listSaleProducts({ include: (order.order_items ?? []).map((item) => item.product_id) });
  const lines = parseLines(formData.get("lines"), new Map(products.map((product) => [product.id, product])));
  const proposal = parseProposal(formData, parisDay(new Date()), { canDeliver: Boolean(order.delivery_postal_code) });
  if (!proposal.ok || !lines.ok) {
    return formFailure("Certains champs sont à corriger.", { ...(proposal.ok ? {} : proposal.errors), ...(lines.ok ? {} : { lines: lines.error }) });
  }

  const email = order.contact_email ?? order.customers?.email ?? null;
  const token = email && formData.get("notify") === "on" ? createLinkToken() : null;
  const { data: proposalId, error } = await supabase.rpc("admin_propose_order", {
    p_order_id: id,
    p_expected_updated_at: field(formData, "version") || null,
    p_proposal: {
      delivery_method: proposal.value.deliveryMethod,
      requested_date: proposal.value.requestedDate,
      delivery_fee: centsToDecimal(proposal.value.deliveryFeeCents),
      message: proposal.value.message,
      items: linesPayload(lines.lines),
    },
    p_token_hash: token?.hash ?? null,
    p_expires_at: new Date(Date.now() + PROPOSAL_LINK_DAYS * DAY).toISOString(),
  });
  if (error) {
    revalidateOrder(id);
    if (error.code === "40001") return formFailure("Cette demande a changé entre-temps (autre onglet ?). Rechargez la page pour repartir de sa dernière version.");
    if (error.code === "55000") return formFailure("Cette demande n’est plus à valider : rechargez la page.");
    if (error.code === "22023") return formFailure("Certains champs sont à corriger.", { lines: "Vérifiez les produits, les quantités et les prix." });
    console.error("Proposition", error.code, error.message);
    return formFailure("La proposition n’a pas pu être enregistrée. Réessayez.");
  }

  let outcome = "enregistree";
  if (token) {
    // Montants relus en base (calculés par la fonction SQL) pour l'email.
    const { data: stored } = await supabase
      .from("order_proposals")
      .select("items, delivery_method, requested_date, subtotal, delivery_fee, total_amount")
      .eq("id", proposalId as string)
      .maybeSingle();
    const queued = stored
      ? await scheduleOrderEmails(id, ["order_proposal"], {
          note: proposal.value.message || null,
          queueNow: true,
          dedupeSuffix: proposalId as string,
          extra: proposalEmailExtra(readTerms(stored), `${await getSiteUrl()}/proposition/${token.token}`),
        })
      : "failed";
    if (!queued || queued === "failed") {
      // Sans email, le lien serait perdu : la proposition est retirée.
      await supabase.rpc("admin_resolve_order_proposal", { p_proposal_id: proposalId, p_action: "withdraw", p_expected_updated_at: null });
      revalidateOrder(id);
      return formFailure("L’email de proposition n’a pas pu être préparé : rien n’a été envoyé au client. Réessayez dans un instant.");
    }
    revalidatePath("/admin/emails");
    outcome = getEmailConfig().provider ? "envoyee" : "preparee";
  }
  revalidateOrder(id);
  redirect(`/admin/commandes/${id}?proposition=${outcome}`);
}

/** Accord du client obtenu autrement que par le lien (« appliquer »), ou proposition retirée. */
export async function resolveProposalAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin("/admin/commandes");
  const id = field(formData, "id");
  const proposalId = field(formData, "proposal");
  const decision = field(formData, "decision");
  if (!UUID.test(id) || !UUID.test(proposalId) || (decision !== "apply" && decision !== "withdraw")) return failure("Action invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_resolve_order_proposal", {
    p_proposal_id: proposalId,
    p_action: decision,
    p_expected_updated_at: field(formData, "version") || null,
  });
  revalidateOrder(id);
  if (error) return rpcFailure(error);
  if (data === "withdrawn") return success("Proposition retirée : la demande est de nouveau à valider ; un lien déjà envoyé au client ne fonctionne plus.");
  if (data === "accepted_stock_short") {
    return failure("Proposition appliquée, mais le stock ne suffit plus : la commande modifiée est de nouveau à valider. Ajustez le stock, puis acceptez-la.");
  }
  const notice = await notifyCustomer(formData, id, "order_accepted", field(formData, "note"));
  return success(`Proposition appliquée : commande acceptée, stock mis à jour.${notice}`);
}

/**
 * Vente manuelle (CAHIER §17.4) : marché, téléphone, virement. Acceptée
 * d'emblée, stock décompté ; récapitulatif par email si le client en a un.
 */
export async function createManualOrderAction(_previous: OrderFormState, formData: FormData): Promise<OrderFormState> {
  await requireAdmin("/admin/commandes");
  const key = field(formData, "submissionKey");
  if (!UUID.test(key)) return formFailure("Rechargez la page, puis recommencez.");

  const products = await listSaleProducts();
  const lines = parseLines(formData.get("lines"), new Map(products.map((product) => [product.id, product])));
  const sale = parseManualSale(formData, parisDay(new Date()));
  if (!sale.ok || !lines.ok) {
    return formFailure("Certains champs sont à corriger.", { ...(sale.ok ? {} : sale.errors), ...(lines.ok ? {} : { lines: lines.error }) });
  }
  const value = sale.value;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("admin_create_manual_order", {
      p_order: {
        submission_key: key,
        name: value.name,
        email: value.email,
        phone: value.phone,
        company_name: value.companyName,
        professional_id: value.professionalId,
        delivery_method: value.deliveryMethod,
        address_line1: value.addressLine1,
        postal_code: value.postalCode,
        city: value.city,
        delivery_fee: centsToDecimal(value.deliveryFeeCents),
        fulfillment_status: value.step,
        requested_date: value.requestedDate,
        paid: value.paid,
        payment_method: value.paymentMethod,
        note: value.note,
        items: linesPayload(lines.lines),
      },
    })
    .single<{ order_id: string; order_number: string; already_created: boolean }>();
  if (error || !data) {
    if (error?.code === "P0001" && error.message.startsWith("Stock insuffisant")) {
      return formFailure("Le stock ne suffit pas.", { lines: `${error.message.replace("Stock insuffisant :", "Stock insuffisant pour")}. Corrigez la quantité, ou le stock du produit.` });
    }
    if (error?.code === "22023" || error?.code === "23514") return formFailure("Certains champs sont à corriger.");
    console.error("Vente manuelle", error?.code, error?.message);
    return formFailure("La vente n’a pas pu être enregistrée. Réessayez.");
  }

  if (!data.already_created && value.email) {
    if (formData.get("notify") === "on") await scheduleOrderEmails(data.order_id, ["order_confirmed"], { queueNow: true });
    // Vente déjà remise : la demande d'avis part après le délai réglé.
    if (value.step === "delivered") await scheduleReviewInvitation(data.order_id);
  }
  revalidateOrder(data.order_id);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/emails");
  redirect(`/admin/commandes/${data.order_id}?vente=enregistree`);
}
