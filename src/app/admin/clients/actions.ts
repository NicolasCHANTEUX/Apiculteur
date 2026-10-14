"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { runPurge } from "@/data/privacy";
import { REQUEST_PHOTOS_BUCKET } from "@/data/requests";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function updateCustomerAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/clients");
  const id = field(formData, "id", 40);
  if (!UUID.test(id)) return failure("Client invalide.");
  const name = field(formData, "name", 120).replace(/\s+/g, " ");
  const phone = field(formData, "phone", 30);
  if (name.length < 2) return failure("Indiquez le nom du client.");
  if (phone && (phone.match(/\d/g)?.length ?? 0) < 6) return failure("Numéro de téléphone invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ full_name: name, phone: phone || null, internal_note: field(formData, "note", 4000) || null })
    .eq("id", id)
    .not("email", "like", "anonyme-%@anonymise.invalid")
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("Client : mise à jour", error.code, error.message);
    return failure("La fiche n’a pas pu être enregistrée.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "customer.updated", entityType: "customer", entityId: id });
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return success("Fiche client enregistrée.");
}

/**
 * Droit à l'effacement (CAHIER §19) : fiche supprimée si le client n'a
 * jamais commandé, sinon anonymisée (commandes gardées pour la
 * comptabilité). Demandes, photos et emails du client supprimés.
 */
export async function forgetCustomerAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin("/admin/clients");
  const id = field(formData, "id", 40);
  if (!UUID.test(id)) return failure("Client invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_forget_customer", { p_customer_id: id });
  if (error) {
    if (error.code === "55000") return failure("Ce client est déjà anonymisé.");
    console.error("Effacement client", error.code, error.message);
    return failure("L’effacement n’a pas pu être fait. Réessayez.");
  }
  const result = data as { mode: "deleted" | "anonymized"; photo_paths: string[] };
  if (result.photo_paths?.length) {
    const { error: storageError } = await createAdminClient().storage.from(REQUEST_PHOTOS_BUCKET).remove(result.photo_paths);
    if (storageError) console.error("Effacement client : fichiers photo non supprimés", storageError.message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/clients?efface=${result.mode === "deleted" ? "supprime" : "anonymise"}`);
}

/** Purge immédiate des données dont la durée de conservation est dépassée. */
export async function purgeNowAction(): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/clients");
  let counts;
  try {
    counts = await runPurge();
  } catch (error) {
    console.error("Purge", error instanceof Error ? error.message : error);
    return failure("La purge n’a pas pu se terminer. Réessayez.");
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  await recordAudit({ actorUserId: admin.userId, action: "privacy.purged", entityType: "settings", entityId: null, metadata: counts });
  revalidatePath("/admin", "layout");
  if (!total) return success("Rien à supprimer : toutes les données sont dans leurs durées de conservation.");
  const parts = [
    counts.trashedRequests + counts.oldRequests ? `${counts.trashedRequests + counts.oldRequests} demande(s)` : null,
    counts.emails ? `${counts.emails} email(s) du journal` : null,
    counts.invitations ? `${counts.invitations} demande(s) d’avis expirée(s)` : null,
    counts.rateLimits ? `${counts.rateLimits} trace(s) anti-abus` : null,
  ].filter(Boolean);
  return success(`Supprimé : ${parts.join(", ")}.`);
}
