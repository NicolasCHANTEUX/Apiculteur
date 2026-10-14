import "server-only";

import { requireAdmin } from "@/data/auth";
import { isEmailTemplate, emailTemplates } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";

export type EmailStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

export const emailTabs = {
  "a-traiter": "À traiter",
  envoyes: "Envoyés",
  ecartes: "Écartés",
  tous: "Tous",
} as const;

export type EmailTab = keyof typeof emailTabs;

const tabStatuses: Record<EmailTab, EmailStatus[] | null> = {
  "a-traiter": ["pending", "sending", "failed"],
  envoyes: ["sent"],
  ecartes: ["skipped"],
  tous: null,
};

/** Table absente : migration 20261014120000_email_outbox.sql pas encore appliquée. */
function isMissingTable(error: { code?: string }) {
  return error.code === "PGRST205" || error.code === "42P01";
}

/** Lien vers les demandes absent : migration 20261015100000_contact_requests.sql pas encore appliquée. */
function isMissingRequestLink(error: { code?: string }) {
  return error.code === "PGRST200" || error.code === "42703";
}

export function isEmailTab(value: string): value is EmailTab {
  return Object.hasOwn(emailTabs, value);
}

export type AdminEmailRow = {
  id: string;
  template: string;
  templateLabel: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  sentManually: boolean;
  createdAt: string;
  sentAt: string | null;
  updatedAt: string;
  order: { id: string; number: string } | null;
  request: { id: string; reference: string } | null;
  /** Version texte, chargée seulement pour les emails à traiter (envoi depuis sa messagerie). */
  text: string | null;
};

const LIST_COLUMNS =
  "id, template, to_email, to_name, subject, status, attempts, last_error, sent_manually, created_at, sent_at, updated_at, orders(id, order_number)";

type Query = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;

/** Colonnes de la liste, avec la demande liée quand la migration du lot 7 est appliquée. */
async function selectEmails(run: (columns: string) => Query, extra = "") {
  const withRequest = await run(`${LIST_COLUMNS}, contact_requests(id, reference)${extra}`);
  if (withRequest.error && isMissingRequestLink(withRequest.error)) return run(`${LIST_COLUMNS}${extra}`);
  return withRequest;
}

type Row = {
  id: string;
  template: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: EmailStatus;
  attempts: number;
  last_error: string | null;
  sent_manually: boolean;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
  orders: { id: string; order_number: string } | null;
  contact_requests?: { id: string; reference: string } | null;
};

function toRow(row: Row): AdminEmailRow {
  return {
    id: row.id,
    template: row.template,
    templateLabel: isEmailTemplate(row.template) ? emailTemplates[row.template] : row.template,
    toEmail: row.to_email,
    toName: row.to_name,
    subject: row.subject,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    sentManually: row.sent_manually,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    updatedAt: row.updated_at,
    order: row.orders ? { id: row.orders.id, number: row.orders.order_number } : null,
    request: row.contact_requests ? { id: row.contact_requests.id, reference: row.contact_requests.reference } : null,
    text: null,
  };
}

/** Ajoute la version texte des emails encore à envoyer (pour le lien « messagerie »). */
async function withTexts(supabase: Awaited<ReturnType<typeof createClient>>, rows: AdminEmailRow[]) {
  const open = rows.filter((row) => row.status === "pending" || row.status === "failed").map((row) => row.id);
  if (open.length === 0) return rows;
  const { data, error } = await supabase.from("email_outbox").select("id, text_body").in("id", open.slice(0, 100));
  if (error) {
    console.error("Emails : versions texte", error.code, error.message);
    return rows;
  }
  const texts = new Map((data ?? []).map((row) => [row.id as string, row.text_body as string]));
  return rows.map((row) => ({ ...row, text: texts.get(row.id) ?? null }));
}

// Journal des emails (CAHIER §14). Quelques centaines par saison : compteurs
// en mémoire sur les 500 plus récents.
export async function listAdminEmails(tab: EmailTab) {
  await requireAdmin("/admin/emails");
  const supabase = await createClient();
  const { data, error } = await selectEmails((columns) =>
    supabase.from("email_outbox").select(columns).order("created_at", { ascending: false }).limit(500),
  );
  if (error && isMissingTable(error)) {
    return { emails: [], counts: { "a-traiter": 0, envoyes: 0, ecartes: 0, tous: 0 }, missingTable: true };
  }
  if (error) throw new Error(`Emails: ${error.message}`);
  const rows = ((data ?? []) as unknown as Row[]).map(toRow);
  const counts = Object.fromEntries(
    (Object.keys(emailTabs) as EmailTab[]).map((value) => {
      const statuses = tabStatuses[value];
      return [value, statuses ? rows.filter((row) => statuses.includes(row.status)).length : rows.length];
    }),
  ) as Record<EmailTab, number>;
  const statuses = tabStatuses[tab];
  const emails = statuses ? rows.filter((row) => statuses.includes(row.status)) : rows;
  return { emails: await withTexts(supabase, emails), counts, missingTable: false };
}

/** Emails en attente ou en échec (badge de la navigation). Zéro en cas d'erreur. */
export async function countEmailsToHandle(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "failed"]);
  if (error) {
    // Table absente tant que la migration n'est pas appliquée : silencieux.
    if (!isMissingTable(error)) console.error("Emails à traiter", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Emails d'une commande ou d'une demande, du plus ancien au plus récent. */
export async function listEmailsFor(target: { orderId: string } | { contactRequestId: string }): Promise<AdminEmailRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const [column, value] = "orderId" in target ? ["order_id", target.orderId] : ["contact_request_id", target.contactRequestId];
  const { data, error } = await selectEmails((columns) =>
    supabase.from("email_outbox").select(columns).eq(column, value).order("created_at", { ascending: true }),
  );
  if (error) {
    if (!isMissingTable(error) && !isMissingRequestLink(error)) console.error("Emails liés", error.code, error.message);
    return [];
  }
  return withTexts(supabase, ((data ?? []) as unknown as Row[]).map(toRow));
}

export async function listOrderEmails(orderId: string): Promise<AdminEmailRow[]> {
  return listEmailsFor({ orderId });
}

export type AdminEmail = Omit<AdminEmailRow, "text"> & {
  replyTo: string | null;
  html: string;
  text: string;
  provider: string | null;
};

export async function getAdminEmail(id: string): Promise<AdminEmail | null> {
  await requireAdmin(`/admin/emails/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await selectEmails(
    (columns) => supabase.from("email_outbox").select(columns).eq("id", id).maybeSingle(),
    ", reply_to, html, text_body, provider",
  );
  if (error) throw new Error(`Email: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as Row & { reply_to: string | null; html: string; text_body: string; provider: string | null };
  return { ...toRow(row), replyTo: row.reply_to, html: row.html, text: row.text_body, provider: row.provider };
}
