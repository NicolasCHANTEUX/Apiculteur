import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEntry = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

// Journal des actions admin (table audit_logs, insertion réservée au rôle
// service). Un échec d'écriture est signalé dans les logs sans annuler
// l'action déjà effectuée ; les opérations critiques (commandes) écrivent
// leur historique dans la même transaction SQL.
export async function recordAudit(entry: AuditEntry) {
  const { error } = await createAdminClient()
    .from("audit_logs")
    .insert({
      actor_user_id: entry.actorUserId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });

  if (error) {
    console.error(
      `Journal d'audit indisponible (${entry.action}): ${error.message}`,
    );
  }
}
