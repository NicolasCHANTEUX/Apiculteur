import "server-only";

import { after } from "next/server";
import { eurosToCents } from "@/lib/domain/pricing";
import { EmailSendError, createEmailDriver, readEmailConfig, type EmailConfig } from "@/lib/email/driver";
import {
  orderEmailKey,
  renderOrderEmail,
  renderTestEmail,
  type EmailIdentity,
  type EmailTemplate,
  type OrderEmailContext,
} from "@/lib/email/templates";
import { site } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

// File d'envoi des emails (ROADMAP lot 6, H7). Chaque email est d'abord
// enregistré dans `email_outbox`, puis envoyé par le fournisseur configuré.
// Sans fournisseur, il reste « à envoyer » dans l'admin. Les logs ne
// contiennent ni adresse ni contenu (CAHIER §14).

export function getEmailConfig(): EmailConfig {
  return readEmailConfig(process.env);
}

export type OrderEmailTemplate = Exclude<EmailTemplate, "test">;

async function emailIdentity(siteUrl?: string): Promise<EmailIdentity> {
  return {
    siteName: site.name,
    ownerName: site.owner.fullName,
    ownerFirstName: site.owner.firstName,
    siteUrl: siteUrl ?? (await getSiteUrl()),
    contactEmail: site.email,
    phone: site.phone,
  };
}

type OrderRow = {
  id: string;
  order_number: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  total_amount: number | string;
  delivery_method: "pickup" | "delivery";
  delivery_address_line1: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  requested_date: string | null;
  customer_message: string | null;
  payment_status: string;
  payment_method: string | null;
  review_reasons: string[] | null;
  customers: { full_name: string; email: string; phone: string | null } | null;
  order_items: { product_name_snapshot: string; quantity: number; unit_price: number | string; line_total: number | string }[] | null;
};

async function loadOrderContext(orderId: string, note: string | null): Promise<OrderEmailContext | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(
      "id, order_number, contact_name, contact_email, contact_phone, company_name, total_amount, delivery_method, delivery_address_line1, delivery_postal_code, delivery_city, requested_date, customer_message, payment_status, payment_method, review_reasons, customers(full_name, email, phone), order_items(product_name_snapshot, quantity, unit_price, line_total)",
    )
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (error) throw new Error(`Commande pour email : ${error.message}`);
  if (!data) return null;
  const email = data.contact_email ?? data.customers?.email ?? null;
  if (!email) return null;
  const city = [data.delivery_postal_code, data.delivery_city].filter(Boolean).join(" ");
  return {
    id: data.id,
    number: data.order_number,
    customerName: data.contact_name ?? data.customers?.full_name ?? "Madame, Monsieur",
    companyName: data.company_name,
    email,
    phone: data.contact_phone ?? data.customers?.phone ?? null,
    lines: (data.order_items ?? []).map((item) => ({
      name: item.product_name_snapshot,
      quantity: item.quantity,
      unitPriceCents: eurosToCents(item.unit_price),
      lineTotalCents: eurosToCents(item.line_total),
    })),
    totalCents: eurosToCents(data.total_amount),
    deliveryMethod: data.delivery_method,
    address: data.delivery_method === "delivery" ? [data.delivery_address_line1, city].filter(Boolean).join("\n") || null : null,
    requestedDate: data.requested_date,
    customerMessage: data.customer_message,
    note: note?.trim() || null,
    paymentMethod: data.payment_method,
    paid: data.payment_status === "paid",
    reviewReasons: data.review_reasons ?? [],
  };
}

/**
 * Met en file les emails d'une étape de commande. Un même email (modèle +
 * commande) n'est jamais mis deux fois en file. Renvoie les identifiants
 * ajoutés.
 */
export async function queueOrderEmails(
  orderId: string,
  templates: OrderEmailTemplate[],
  options: { note?: string | null; siteUrl?: string } = {},
): Promise<string[]> {
  const order = await loadOrderContext(orderId, options.note ?? null);
  if (!order) return [];
  const config = getEmailConfig();
  const identity = await emailIdentity(options.siteUrl);

  const rows = templates.flatMap((template) => {
    const forAdmin = template === "order_new_admin";
    // L'alerte « nouvelle demande » n'a de sens que si elle part toute seule :
    // la demande est déjà visible dans l'admin.
    if (forAdmin && !(config.provider && config.adminEmail)) return [];
    const rendered = renderOrderEmail(template, order, identity);
    return [
      {
        template,
        dedupe_key: orderEmailKey(template, order.id),
        to_email: forAdmin ? config.adminEmail! : order.email,
        to_name: forAdmin ? null : order.customerName.slice(0, 120),
        // Répondre à l'alerte écrit directement au client.
        reply_to: forAdmin ? order.email : config.replyTo,
        subject: rendered.subject.slice(0, 200),
        html: rendered.html,
        text_body: rendered.text,
        order_id: order.id,
      },
    ];
  });
  if (rows.length === 0) return [];

  const { data, error } = await createAdminClient()
    .from("email_outbox")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`File d'emails : ${error.message}`);
  return (data ?? []).map((row) => row.id as string);
}

type ClaimedEmail = {
  id: string;
  to_email: string;
  to_name: string | null;
  reply_to: string | null;
  subject: string;
  html: string;
  text_body: string;
};

export type DeliveryResult = { id: string; status: "sent" | "failed" | "skipped"; error?: string };

/**
 * Envoie les emails donnés avec le fournisseur configuré, plus les échecs
 * récents à réessayer. Sans fournisseur, ne fait rien.
 */
export async function deliverEmails(ids: string[], { retryFailed = true } = {}): Promise<DeliveryResult[]> {
  const config = getEmailConfig();
  const driver = createEmailDriver(config);
  if (!driver) return [];
  const supabase = createAdminClient();

  const queue = [...ids];
  if (retryFailed) {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("email_outbox")
      .select("id")
      .eq("status", "failed")
      .lt("attempts", 3)
      .gte("created_at", since)
      .order("created_at")
      .limit(10);
    for (const row of data ?? []) if (!queue.includes(row.id as string)) queue.push(row.id as string);
  }

  const results: DeliveryResult[] = [];
  for (const id of queue) {
    const { data: claimed, error: claimError } = await supabase.rpc("claim_outbox_email", { p_id: id }).maybeSingle<ClaimedEmail>();
    if (claimError) {
      console.error("Email : prise en charge impossible", claimError.code, claimError.message);
      results.push({ id, status: "failed", error: "File d’emails indisponible." });
      continue;
    }
    if (!claimed) {
      // Déjà envoyé, écarté ou en cours d'envoi ailleurs.
      results.push({ id, status: "skipped" });
      continue;
    }

    try {
      const { messageId } = await driver.send({
        to: { email: claimed.to_email, name: claimed.to_name },
        replyTo: claimed.reply_to,
        subject: claimed.subject,
        html: claimed.html,
        text: claimed.text_body,
        idempotencyKey: claimed.id,
      });
      const { error } = await supabase
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider: driver.provider, provider_message_id: messageId?.slice(0, 200) ?? null, last_error: null })
        .eq("id", id);
      if (error) console.error("Email envoyé mais journal non mis à jour", error.message);
      results.push({ id, status: "sent" });
    } catch (error) {
      const message = error instanceof EmailSendError ? error.message : "Erreur inattendue pendant l’envoi.";
      if (!(error instanceof EmailSendError)) console.error("Email : erreur inattendue", error);
      else console.error("Email : envoi refusé", message);
      await supabase
        .from("email_outbox")
        .update({ status: "failed", provider: driver.provider, last_error: message.slice(0, 500) })
        .eq("id", id);
      results.push({ id, status: "failed", error: message });
    }
  }
  return results;
}

/**
 * Prépare les emails d'une étape de commande et les envoie *après* la
 * réponse au navigateur : l'action reste rapide, et un souci d'email ne
 * bloque jamais la commande. `queueNow` : mise en file immédiate, pour que
 * la page admin rechargée affiche déjà l'email ; renvoie alors le nombre
 * d'emails ajoutés (0 si déjà en file pour cette étape, ou sans adresse),
 * ou « failed » si la file est indisponible.
 */
export async function scheduleOrderEmails(
  orderId: string,
  templates: OrderEmailTemplate[],
  { note = null, queueNow = false }: { note?: string | null; queueNow?: boolean } = {},
): Promise<number | "failed" | null> {
  // L'adresse du site dépend de la requête : lue maintenant.
  const siteUrl = await getSiteUrl();
  const report = (error: unknown) => console.error("Emails de commande", error instanceof Error ? error.message : error);

  if (queueNow) {
    let ids: string[];
    try {
      ids = await queueOrderEmails(orderId, templates, { note, siteUrl });
    } catch (error) {
      report(error);
      return "failed";
    }
    if (ids.length) after(() => deliverEmails(ids).then(() => undefined, report));
    return ids.length;
  }

  after(async () => {
    try {
      await deliverEmails(await queueOrderEmails(orderId, templates, { note, siteUrl }));
    } catch (error) {
      report(error);
    }
  });
  return null;
}

/** Email de test, envoyé tout de suite (vérification de la configuration). */
export async function sendTestEmail(to: string): Promise<DeliveryResult | null> {
  const rendered = renderTestEmail(await emailIdentity());
  const { data, error } = await createAdminClient()
    .from("email_outbox")
    .insert({ template: "test", to_email: to, subject: rendered.subject, html: rendered.html, text_body: rendered.text, reply_to: getEmailConfig().replyTo })
    .select("id")
    .single();
  if (error || !data) throw new Error(`File d'emails : ${error?.message ?? "insertion impossible"}`);
  const [result] = await deliverEmails([data.id as string], { retryFailed: false });
  return result ?? null;
}
