"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { deliverEmails, getEmailConfig, sendTestEmail } from "@/data/email";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { emailTemplates, isEmailTemplate } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateEmails(id: string, orderId?: string | null) {
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${id}`);
  if (orderId) revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin", "layout");
}

type Changed = { id: string; template: string; order_id: string | null; orders: { order_number: string } | null };

// Les écritures passent par le rôle service (la table n'est pas modifiable
// avec la session admin), une fois les droits vérifiés.
async function changeStatus(id: string, from: string[], values: Record<string, unknown>) {
  const { data, error } = await createAdminClient()
    .from("email_outbox")
    .update(values)
    .eq("id", id)
    .in("status", from)
    .select("id, template, order_id, orders(order_number)")
    .maybeSingle<Changed>();
  if (error) console.error("Email : mise à jour", error.code, error.message);
  return { email: data, error };
}

async function audit(userId: string, action: string, email: Changed) {
  const templateLabel = isEmailTemplate(email.template) ? emailTemplates[email.template] : email.template;
  await recordAudit({
    actorUserId: userId,
    action,
    entityType: email.order_id ? "order" : "email",
    entityId: email.order_id ?? email.id,
    metadata: { template_label: templateLabel, order_number: email.orders?.order_number },
  });
}

function emailId(formData: FormData) {
  const id = formData.get("id");
  return typeof id === "string" && UUID.test(id) ? id : null;
}

export async function sendEmailNowAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin("/admin/emails");
  const id = emailId(formData);
  if (!id) return failure("Email invalide.");
  if (!getEmailConfig().provider) return failure("Aucun service d’envoi n’est configuré : envoyez-le depuis votre messagerie.");

  const [result] = await deliverEmails([id], { retryFailed: false });
  const orderId = formData.get("orderId");
  revalidateEmails(id, typeof orderId === "string" && UUID.test(orderId) ? orderId : null);
  if (result?.status === "sent") return success("Email envoyé.");
  if (result?.status === "failed") return failure(`L’envoi a échoué : ${result.error ?? "erreur inconnue"}.`);
  return failure("Cet email est déjà envoyé, écarté ou en cours d’envoi.");
}

export async function markEmailSentAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/emails");
  const id = emailId(formData);
  if (!id) return failure("Email invalide.");
  const { email, error } = await changeStatus(id, ["pending", "failed"], {
    status: "sent",
    sent_manually: true,
    sent_at: new Date().toISOString(),
    last_error: null,
  });
  if (error) return failure("Le changement n’a pas pu être enregistré. Réessayez.");
  if (!email) {
    revalidateEmails(id);
    return failure("Cet email a déjà été traité entre-temps.");
  }
  await audit(admin.userId, "email.sent_manually", email);
  revalidateEmails(id, email.order_id);
  return success("Email marqué comme envoyé.");
}

export async function skipEmailAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/emails");
  const id = emailId(formData);
  if (!id) return failure("Email invalide.");
  const { email, error } = await changeStatus(id, ["pending", "failed"], { status: "skipped" });
  if (error) return failure("Le changement n’a pas pu être enregistré. Réessayez.");
  if (!email) {
    revalidateEmails(id);
    return failure("Cet email a déjà été traité entre-temps.");
  }
  await audit(admin.userId, "email.skipped", email);
  revalidateEmails(id, email.order_id);
  return success("Email écarté : il ne sera pas envoyé.");
}

export async function restoreEmailAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/emails");
  const id = emailId(formData);
  if (!id) return failure("Email invalide.");
  const { email, error } = await changeStatus(id, ["skipped"], { status: "pending" });
  if (error) return failure("Le changement n’a pas pu être enregistré. Réessayez.");
  if (!email) {
    revalidateEmails(id);
    return failure("Cet email a déjà été traité entre-temps.");
  }
  await audit(admin.userId, "email.restored", email);
  revalidateEmails(id, email.order_id);
  return success("Email remis à envoyer.");
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/emails");
  const config = getEmailConfig();
  if (!config.provider) return failure("Aucun service d’envoi n’est configuré.");
  const to = config.adminEmail ?? admin.email;
  if (!to) return failure("Aucune adresse de destination : renseignez ADMIN_NOTIFICATION_EMAIL.");

  let result;
  try {
    result = await sendTestEmail(to);
  } catch (error) {
    console.error("Email de test", error instanceof Error ? error.message : error);
    return failure("L’email de test n’a pas pu être préparé. Réessayez.");
  }
  revalidatePath("/admin/emails");
  if (result?.status === "sent") {
    await recordAudit({ actorUserId: admin.userId, action: "email.test_sent", entityType: "email", entityId: result.id });
    return success(`Email de test envoyé à ${to}. Vérifiez votre boîte de réception (et les indésirables).`);
  }
  return failure(`L’email de test n’est pas parti : ${result?.error ?? "erreur inconnue"}.`);
}
