import "server-only";

import { requireAdmin } from "@/data/auth";
import { describeAuditAction } from "@/lib/admin/audit-labels";
import { bucketByDay } from "@/lib/admin/series";
import { createClient } from "@/lib/supabase/server";

export type ActivityEntry = {
  id: string;
  /** Code de l'action (« product.stock_updated »…), pour choisir une icône. */
  action: string;
  createdAt: string;
  label: string;
  /** Nom actuel de l'objet, ou celui noté au moment de l'action. */
  subject: string | null;
  href: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Dernières actions du journal d'audit (lecture réservée aux admins par la
 * RLS). Renvoie null si le journal est indisponible (migration non
 * appliquée…) : le tableau de bord reste affiché.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityEntry[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Journal d'audit", error.code, error.message);
    return null;
  }

  const rows = (data ?? []) as AuditRow[];
  const productIds = [
    ...new Set(rows.filter((row) => row.entity_type === "product" && row.entity_id).map((row) => row.entity_id as string)),
  ];
  const names = new Map<string, string>();
  if (productIds.length) {
    const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
    for (const product of products ?? []) names.set(product.id as string, product.name as string);
  }

  return rows.map((row) => {
    const recordedName =
      typeof row.metadata?.name === "string"
        ? row.metadata.name
        : typeof row.metadata?.order_number === "string"
          ? row.metadata.order_number
          : typeof row.metadata?.reference === "string"
            ? row.metadata.reference
            : null;
    const currentName = row.entity_id ? names.get(row.entity_id) : undefined;
    let href: string | null = null;
    if (row.entity_type === "product" && row.entity_id && currentName) href = `/admin/produits/${row.entity_id}`;
    if (row.entity_type === "category" && row.action !== "category.deleted") href = "/admin/categories";
    if (row.entity_type === "order" && row.entity_id) href = `/admin/commandes/${row.entity_id}`;
    if (row.entity_type === "settings") href = row.action.startsWith("settings.review") ? "/admin/avis" : "/admin/commandes";
    if (row.entity_type === "email") href = "/admin/emails";
    if (row.entity_type === "review") href = "/admin/avis?statut=tous";
    if (row.entity_type === "customer" && row.entity_id && row.action !== "customer.deleted") href = `/admin/clients/${row.entity_id}`;
    if (row.action.startsWith("legal.")) href = "/admin/informations-legales";
    if (row.action.startsWith("delivery.")) href = "/admin/livraison";
    if (row.entity_type === "contact_request" && row.entity_id && row.action !== "request.deleted") href = `/admin/demandes/${row.entity_id}`;
    return {
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      label: describeAuditAction(row.action, row.metadata),
      subject: currentName ?? recordedName,
      href,
    };
  });
}

/** Nombre d'actions admin par jour sur `days` ; null si le journal est indisponible. */
export async function getActivitySeries(days: string[]): Promise<number[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const since = new Date(`${days[0]}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 1);
  const { data, error } = await supabase
    .from("audit_logs")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .limit(10_000);
  if (error) {
    console.error("Journal d'audit", error.code, error.message);
    return null;
  }
  return bucketByDay(days, (data ?? []).map((row) => ({ at: row.created_at as string })));
}
