import "server-only";

import { getPublishedLegal } from "@/data/legal";
import { REQUEST_PHOTOS_BUCKET } from "@/data/requests";
import { defaultLegalConfig } from "@/lib/legal/config";
import { createAdminClient } from "@/lib/supabase/admin";

// Durées de conservation et purge automatique (CAHIER §19). Les durées
// sont celles de la version légale publiée (ou les valeurs par défaut) :
// un brouillon non approuvé ne supprime jamais rien. Commandes et factures
// sont conservées (obligation comptable).

const DAY = 86_400_000;

export type Retention = { requestsRetentionMonths: number; emailLogMonths: number; trashDays: number };

export async function getRetention(): Promise<Retention> {
  const published = await getPublishedLegal();
  const source = published?.config ?? defaultLegalConfig;
  return { requestsRetentionMonths: source.requestsRetentionMonths, emailLogMonths: source.emailLogMonths, trashDays: source.trashDays };
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

export type PurgeCounts = { trashedRequests: number; oldRequests: number; emails: number; invitations: number; rateLimits: number };

/** Ce qui serait supprimé maintenant (aperçu dans l'admin). */
export async function previewPurge(retention: Retention): Promise<PurgeCounts | null> {
  const supabase = createAdminClient();
  const count = async (query: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: value, error } = await query;
    if (error) throw new Error(error.message);
    return value ?? 0;
  };
  const head = { count: "exact" as const, head: true };
  try {
    const [trashedRequests, oldRequests, emails, invitations, rateLimits] = await Promise.all([
      count(supabase.from("contact_requests").select("id", head).lt("deleted_at", new Date(Date.now() - retention.trashDays * DAY).toISOString())),
      count(supabase.from("contact_requests").select("id", head).is("deleted_at", null).in("status", ["answered", "closed"]).lt("updated_at", monthsAgo(retention.requestsRetentionMonths))),
      count(supabase.from("email_outbox").select("id", head).lt("created_at", monthsAgo(retention.emailLogMonths))),
      count(supabase.from("review_invitations").select("id", head).is("used_at", null).lt("expires_at", new Date(Date.now() - 90 * DAY).toISOString())),
      count(supabase.from("rate_limits").select("key", head).lt("reset_at", new Date(Date.now() - DAY).toISOString())),
    ]);
    return { trashedRequests, oldRequests, emails, invitations, rateLimits };
  } catch (error) {
    console.error("Aperçu de la purge", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Supprime ce qui a dépassé sa durée de conservation, photos comprises. */
export async function runPurge(): Promise<PurgeCounts> {
  const retention = await getRetention();
  const supabase = createAdminClient();
  const counts: PurgeCounts = { trashedRequests: 0, oldRequests: 0, emails: 0, invitations: 0, rateLimits: 0 };

  // Demandes : corbeille ancienne, puis demandes traitées anciennes.
  const requestBatches = [
    { key: "trashedRequests" as const, query: supabase.from("contact_requests").select("id").lt("deleted_at", new Date(Date.now() - retention.trashDays * DAY).toISOString()).limit(500) },
    {
      key: "oldRequests" as const,
      query: supabase.from("contact_requests").select("id").is("deleted_at", null).in("status", ["answered", "closed"]).lt("updated_at", monthsAgo(retention.requestsRetentionMonths)).limit(500),
    },
  ];
  for (const batch of requestBatches) {
    const { data, error } = await batch.query;
    if (error) throw new Error(`Purge des demandes : ${error.message}`);
    const ids = (data ?? []).map((row) => row.id as string);
    if (!ids.length) continue;
    const { data: photos } = await supabase.from("contact_request_photos").select("storage_path").in("request_id", ids);
    const { error: deleteError } = await supabase.from("contact_requests").delete().in("id", ids);
    if (deleteError) throw new Error(`Purge des demandes : ${deleteError.message}`);
    const paths = (photos ?? []).map((photo) => photo.storage_path as string);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(REQUEST_PHOTOS_BUCKET).remove(paths);
      if (storageError) console.error("Purge : fichiers photo non supprimés", storageError.message);
    }
    counts[batch.key] = ids.length;
  }

  const removed = async (query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, label: string) => {
    const { data, error } = await query;
    if (error) throw new Error(`Purge ${label} : ${error.message}`);
    return data?.length ?? 0;
  };
  counts.emails = await removed(supabase.from("email_outbox").delete().lt("created_at", monthsAgo(retention.emailLogMonths)).select("id"), "des emails");
  counts.invitations = await removed(
    supabase.from("review_invitations").delete().is("used_at", null).lt("expires_at", new Date(Date.now() - 90 * DAY).toISOString()).select("id"),
    "des demandes d’avis",
  );
  counts.rateLimits = await removed(supabase.from("rate_limits").delete().lt("reset_at", new Date(Date.now() - DAY).toISOString()).select("key"), "des limitations");
  return counts;
}
