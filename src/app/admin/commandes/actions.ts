"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig, scheduleOrderEmails, type OrderEmailTemplate } from "@/data/email";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
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

const steps = ["preparing", "ready", "delivered"] as const;

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
  const notice = step === "ready" ? await notifyCustomer(formData, id, "order_ready") : "";
  revalidateOrder(id);
  return success(`${step === "ready" ? "Commande prête." : step === "delivered" ? "Commande terminée." : "Commande remise en préparation."}${notice}`);
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
  const open = formData.get("open") === "true";

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
