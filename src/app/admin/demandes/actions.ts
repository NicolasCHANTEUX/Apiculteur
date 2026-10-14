"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig, scheduleRequestEmails } from "@/data/email";
import { REQUEST_PHOTOS_BUCKET } from "@/data/requests";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { isRequestStatus, requestStatuses } from "@/lib/requests/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFLICT = failure("Cette demande a changé entre-temps (autre onglet ?). La page affiche maintenant sa dernière version.");
const UNAVAILABLE = failure("L’opération n’a pas pu être enregistrée. Réessayez.");

function field(formData: FormData, name: string, max = 5000) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(formData: FormData) {
  const id = field(formData, "id", 40);
  return UUID.test(id) ? id : null;
}

function revalidateRequest(id: string) {
  revalidatePath("/admin/demandes");
  revalidatePath(`/admin/demandes/${id}`);
  // Badge de la navigation et tableau de bord.
  revalidatePath("/admin", "layout");
}

async function audit(userId: string, action: string, id: string, metadata: Record<string, unknown> = {}) {
  await recordAudit({ actorUserId: userId, action, entityType: "contact_request", entityId: id, metadata });
}

// Statut (nouvelle, en cours, réponse envoyée, clôturée), avec contrôle de
// conflit : la version affichée doit être la dernière.
export async function setRequestStatusAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  const status = field(formData, "status", 20);
  if (!id || !isRequestStatus(status)) return failure("Action invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status })
    .eq("id", id)
    .eq("updated_at", field(formData, "version", 40))
    .is("deleted_at", null)
    .select("reference");
  if (error) {
    console.error("Demande : statut", error.code, error.message);
    return UNAVAILABLE;
  }
  revalidateRequest(id);
  if (!data?.length) return CONFLICT;
  await audit(admin.userId, "request.status_changed", id, { status, reference: data[0].reference });
  return success(`Demande passée en « ${requestStatuses[status].toLowerCase()} ».`);
}

export async function saveRequestNoteAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  if (!id) return failure("Demande invalide.");
  const note = field(formData, "note", 4000);

  const supabase = await createClient();
  const { data, error } = await supabase.from("contact_requests").update({ admin_note: note || null }).eq("id", id).select("reference");
  if (error || !data?.length) {
    if (error) console.error("Demande : note", error.code, error.message);
    return UNAVAILABLE;
  }
  await audit(admin.userId, "request.note_updated", id, { reference: data[0].reference });
  revalidateRequest(id);
  return success("Note enregistrée.");
}

/**
 * Réponse au client (CAHIER §12.2) : mise en file d'emails, envoyée tout de
 * suite avec un service d'envoi, sinon prête à partir depuis la messagerie.
 * La demande passe en « réponse envoyée ».
 */
export async function replyToRequestAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  const replyKey = field(formData, "replyKey", 40);
  const reply = field(formData, "reply").replace(/\r\n/g, "\n");
  if (!id || !UUID.test(replyKey)) return failure("Action invalide.");
  if (reply.length < 5) return failure("Écrivez votre réponse avant de l’envoyer.");

  const queued = await scheduleRequestEmails(id, ["request_reply"], { reply, replyKey, queueNow: true });
  if (queued === "failed") return failure("La réponse n’a pas pu être préparée. Réessayez, ou écrivez depuis votre messagerie.");
  if (queued === 0) return failure("Cette réponse a déjà été enregistrée.");

  const auto = Boolean(getEmailConfig().provider);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status: "answered", answered_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "closed")
    .select("reference");
  if (error) console.error("Demande : statut après réponse", error.code, error.message);
  await audit(admin.userId, "request.replied", id, { reference: data?.[0]?.reference, prepared: !auto });
  revalidateRequest(id);
  revalidatePath("/admin/emails");
  return success(auto ? "Réponse envoyée au client." : "Réponse prête : ouvrez-la dans votre messagerie (rubrique Emails de la demande).");
}

export async function trashRequestAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  if (!id) return failure("Demande invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("reference");
  if (error) {
    console.error("Demande : corbeille", error.code, error.message);
    return UNAVAILABLE;
  }
  revalidateRequest(id);
  if (!data?.length) return failure("Cette demande est déjà dans la corbeille.");
  await audit(admin.userId, "request.trashed", id, { reference: data[0].reference });
  return success("Demande mise à la corbeille. Vous pouvez la restaurer depuis l’onglet Corbeille.");
}

export async function restoreRequestAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  if (!id) return failure("Demande invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("reference");
  if (error) {
    console.error("Demande : restauration", error.code, error.message);
    return UNAVAILABLE;
  }
  revalidateRequest(id);
  if (!data?.length) return failure("Cette demande n’est plus dans la corbeille.");
  await audit(admin.userId, "request.restored", id, { reference: data[0].reference });
  return success("Demande restaurée, avec ses photos.");
}

// Suppression définitive, seulement depuis la corbeille (garanti aussi par
// la base) : la demande, ses photos et leurs fichiers.
export async function deleteRequestForeverAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/demandes");
  const id = requestId(formData);
  if (!id) return failure("Demande invalide.");
  const supabase = await createClient();
  const { data: photos } = await supabase.from("contact_request_photos").select("storage_path").eq("request_id", id);
  const { data, error } = await supabase.from("contact_requests").delete().eq("id", id).not("deleted_at", "is", null).select("reference");
  if (error) {
    console.error("Demande : suppression", error.code, error.message);
    return UNAVAILABLE;
  }
  if (!data?.length) return failure("Seule une demande de la corbeille peut être supprimée définitivement.");
  const paths = (photos ?? []).map((photo) => photo.storage_path as string);
  if (paths.length) {
    const { error: storageError } = await createAdminClient().storage.from(REQUEST_PHOTOS_BUCKET).remove(paths);
    if (storageError) console.error("Demande : fichiers photo non supprimés", storageError.message);
  }
  await audit(admin.userId, "request.deleted", id, { reference: data[0].reference });
  revalidatePath("/admin/demandes");
  revalidatePath("/admin", "layout");
  // Depuis la fiche, qui n'existe plus : retour à la corbeille.
  if (formData.get("from") === "detail") redirect("/admin/demandes?statut=corbeille");
  return success("Demande supprimée définitivement.");
}
