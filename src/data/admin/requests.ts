import "server-only";

import { listEmailsFor, type AdminEmailRow } from "@/data/admin/emails";
import { requireAdmin } from "@/data/auth";
import { describeAuditAction } from "@/lib/admin/audit-labels";
import { describeRequestDetails, isRequestKind, type RequestKind, type RequestStatus } from "@/lib/requests/form";
import { createClient } from "@/lib/supabase/server";

// Boîte de réception des demandes clients (CAHIER §12.2).

export const requestTabs = {
  "a-traiter": "À traiter",
  repondues: "Répondues",
  cloturees: "Clôturées",
  toutes: "Toutes",
  corbeille: "Corbeille",
} as const;

export type RequestTab = keyof typeof requestTabs;

const tabStatuses: Record<RequestTab, RequestStatus[] | null> = {
  "a-traiter": ["new", "in_progress"],
  repondues: ["answered"],
  cloturees: ["closed"],
  toutes: null,
  corbeille: null,
};

export function isRequestTab(value: string): value is RequestTab {
  return Object.hasOwn(requestTabs, value);
}

export const REQUESTS_PER_PAGE = 25;

export type AdminRequestRow = {
  id: string;
  reference: string;
  kind: RequestKind;
  status: RequestStatus;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  excerpt: string;
  productName: string | null;
  photoCount: number;
  createdAt: string;
  deletedAt: string | null;
};

type ListRow = {
  id: string;
  reference: string;
  kind: string;
  status: RequestStatus;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  product_name: string | null;
  created_at: string;
  deleted_at: string | null;
  contact_request_photos: { count: number }[] | null;
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function isMissingTable(error: { code?: string }) {
  return error.code === "PGRST205" || error.code === "42P01";
}

// Quelques centaines de demandes par saison : filtres, compteurs et pages
// calculés en mémoire sur les 1 000 plus récentes.
export async function listAdminRequests(filters: { tab: RequestTab; kind: RequestKind | null; q: string; page: number }) {
  await requireAdmin("/admin/demandes");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .select("id, reference, kind, status, name, email, phone, subject, message, product_name, created_at, deleted_at, contact_request_photos(count)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error && isMissingTable(error)) return { missingTable: true as const };
  if (error) throw new Error(`Demandes: ${error.message}`);

  const rows: AdminRequestRow[] = ((data ?? []) as ListRow[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    kind: isRequestKind(row.kind) ? row.kind : "contact",
    status: row.status,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    excerpt: row.message.replace(/\s+/g, " ").slice(0, 180),
    productName: row.product_name,
    photoCount: row.contact_request_photos?.[0]?.count ?? 0,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }));

  const words = normalize(filters.q).split(/\s+/).filter(Boolean);
  const searched = words.length
    ? rows.filter((row) => {
        const haystack = normalize(`${row.reference} ${row.name} ${row.email} ${row.phone ?? ""} ${row.subject} ${row.excerpt}`);
        return words.every((word) => haystack.includes(word));
      })
    : rows;

  const inTab = (row: AdminRequestRow, tab: RequestTab) => {
    if (tab === "corbeille") return row.deletedAt !== null;
    if (row.deletedAt !== null) return false;
    const statuses = tabStatuses[tab];
    return statuses ? statuses.includes(row.status) : true;
  };
  const ofKind = searched.filter((row) => !filters.kind || row.kind === filters.kind);
  const counts = Object.fromEntries(
    (Object.keys(requestTabs) as RequestTab[]).map((tab) => [tab, ofKind.filter((row) => inTab(row, tab)).length]),
  ) as Record<RequestTab, number>;
  const kindCounts = {
    all: searched.filter((row) => inTab(row, filters.tab)).length,
    contact: searched.filter((row) => row.kind === "contact" && inTab(row, filters.tab)).length,
    quote: searched.filter((row) => row.kind === "quote" && inTab(row, filters.tab)).length,
    swarm: searched.filter((row) => row.kind === "swarm" && inTab(row, filters.tab)).length,
  };

  const visible = ofKind.filter((row) => inTab(row, filters.tab));
  const pages = Math.max(1, Math.ceil(visible.length / REQUESTS_PER_PAGE));
  const page = Math.min(Math.max(1, filters.page), pages);
  return {
    missingTable: false as const,
    requests: visible.slice((page - 1) * REQUESTS_PER_PAGE, page * REQUESTS_PER_PAGE),
    total: visible.length,
    page,
    pages,
    counts,
    kindCounts,
  };
}

/** Nouvelles demandes hors corbeille (badge de la navigation). Zéro en cas d'erreur. */
export async function countNewRequests(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("contact_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .is("deleted_at", null);
  if (error) {
    if (!isMissingTable(error)) console.error("Nouvelles demandes", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}

export type AdminRequest = {
  id: string;
  reference: string;
  kind: RequestKind;
  status: RequestStatus;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  details: [string, string][];
  productId: string | null;
  productName: string | null;
  adminNote: string | null;
  consentAt: string;
  answeredAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: { id: string; width: number | null; height: number | null }[];
  emails: AdminEmailRow[];
  history: { id: string; createdAt: string; label: string }[];
};

export async function getAdminRequest(id: string): Promise<AdminRequest | null> {
  await requireAdmin(`/admin/demandes/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*, contact_request_photos(id, width, height, position)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Demande: ${error.message}`);
  if (!data) return null;
  const row = data as Record<string, unknown> & {
    contact_request_photos: { id: string; width: number | null; height: number | null; position: number }[] | null;
  };
  const text = (column: string) => (typeof row[column] === "string" ? (row[column] as string) : null);
  const kind = isRequestKind(String(row.kind)) ? (row.kind as RequestKind) : "contact";

  const [emails, history] = await Promise.all([
    listEmailsFor({ contactRequestId: id }),
    supabase
      .from("audit_logs")
      .select("id, action, metadata, created_at")
      .eq("entity_type", "contact_request")
      .eq("entity_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (history.error) console.error("Historique de demande", history.error.message);

  return {
    id: row.id as string,
    reference: row.reference as string,
    kind,
    status: row.status as RequestStatus,
    name: row.name as string,
    email: row.email as string,
    phone: text("phone"),
    subject: row.subject as string,
    message: row.message as string,
    details: describeRequestDetails(kind, row.details as Record<string, unknown> | null),
    productId: text("product_id"),
    productName: text("product_name"),
    adminNote: text("admin_note"),
    consentAt: row.consent_at as string,
    answeredAt: text("answered_at"),
    deletedAt: text("deleted_at"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    photos: (row.contact_request_photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({ id: photo.id, width: photo.width, height: photo.height })),
    emails,
    history: (history.data ?? []).map((event) => ({
      id: event.id as string,
      createdAt: event.created_at as string,
      label: describeAuditAction(event.action as string, event.metadata as Record<string, unknown> | null),
    })),
  };
}
