import "server-only";

import { after } from "next/server";
import { getDeliverySettings } from "@/data/settings";
import { pickupAddress } from "@/lib/delivery/settings";
import { eurosToCents } from "@/lib/domain/pricing";
import { EmailSendError, createEmailDriver, readEmailConfig, type EmailConfig } from "@/lib/email/driver";
import {
  orderEmailKey,
  renderOrderEmail,
  renderRequestEmail,
  renderReviewEmail,
  renderTestEmail,
  type EmailIdentity,
  type OrderEmailContext,
  type OrderTemplate,
  type RequestEmailContext,
  type RequestTemplate,
  type ReviewEmailContext,
  type ReviewTemplate,
} from "@/lib/email/templates";
import { describeRequestDetails, requestKinds, type RequestKind } from "@/lib/requests/form";
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

export type OrderEmailTemplate = OrderTemplate;

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
  delivery_fee: number | string;
  delivery_method: "pickup" | "delivery";
  delivery_address_line1: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  requested_date: string | null;
  customer_message: string | null;
  payment_status: string;
  payment_method: string | null;
  fulfillment_status: string;
  review_reasons: string[] | null;
  customers: { full_name: string; email: string; phone: string | null } | null;
  order_items: { product_name_snapshot: string; quantity: number; unit_price: number | string; line_total: number | string }[] | null;
};

async function loadOrderContext(orderId: string, note: string | null): Promise<OrderEmailContext | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(
      "id, order_number, contact_name, contact_email, contact_phone, company_name, total_amount, delivery_fee, delivery_method, delivery_address_line1, delivery_postal_code, delivery_city, requested_date, customer_message, payment_status, payment_method, fulfillment_status, review_reasons, customers(full_name, email, phone), order_items(product_name_snapshot, quantity, unit_price, line_total)",
    )
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (error) throw new Error(`Commande pour email : ${error.message}`);
  if (!data) return null;
  const email = data.contact_email ?? data.customers?.email ?? null;
  if (!email) return null;
  const city = [data.delivery_postal_code, data.delivery_city].filter(Boolean).join(" ");
  const delivery = await getDeliverySettings();
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
    fulfillmentStatus: data.fulfillment_status,
    reviewReasons: data.review_reasons ?? [],
    deliveryFeeCents: eurosToCents(data.delivery_fee ?? 0),
    pickupAddress: { public: pickupAddress(delivery, "site"), afterAcceptance: pickupAddress(delivery, "accepted") },
  };
}

/** Compléments d'un email de commande (proposition : lignes proposées, lien). */
export type OrderEmailExtra = Partial<Omit<OrderEmailContext, "id" | "number" | "email">>;

/**
 * Met en file les emails d'une étape de commande. Un même email (modèle +
 * commande, plus `dedupeSuffix` quand une étape peut se répéter, comme une
 * proposition) n'est jamais mis deux fois en file. Renvoie les identifiants
 * ajoutés.
 */
export async function queueOrderEmails(
  orderId: string,
  templates: OrderEmailTemplate[],
  options: { note?: string | null; siteUrl?: string; dedupeSuffix?: string; extra?: OrderEmailExtra } = {},
): Promise<string[]> {
  const loaded = await loadOrderContext(orderId, options.note ?? null);
  if (!loaded) return [];
  const order: OrderEmailContext = { ...loaded, ...options.extra };
  const config = getEmailConfig();
  const identity = await emailIdentity(options.siteUrl);

  const rows = templates.flatMap((template) => {
    const forAdmin = template === "order_new_admin" || template === "order_proposal_admin";
    // Les alertes n'ont de sens que si elles partent toutes seules : la
    // demande est déjà visible dans l'admin.
    if (forAdmin && !(config.provider && config.adminEmail)) return [];
    const rendered = renderOrderEmail(template, order, identity);
    return [
      {
        template,
        dedupe_key: `${orderEmailKey(template, order.id)}${options.dedupeSuffix ? `:${options.dedupeSuffix}` : ""}`.slice(0, 200),
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
 * Met en file des emails puis les envoie *après* la réponse au navigateur :
 * l'action reste rapide, et un souci d'email ne bloque jamais l'essentiel.
 * `queueNow` : mise en file immédiate, pour que la page admin rechargée
 * affiche déjà l'email ; renvoie alors le nombre d'emails ajoutés (0 si déjà
 * en file, ou sans adresse), ou « failed » si la file est indisponible.
 */
async function scheduleEmails(
  label: string,
  queue: (siteUrl: string) => Promise<string[]>,
  queueNow: boolean,
): Promise<number | "failed" | null> {
  const report = (error: unknown) => console.error(label, error instanceof Error ? error.message : error);
  // Adresse du site lue maintenant (en développement, elle dépend de la
  // requête). Sans adresse configurée en production, aucun email n'est
  // préparé : l'action principale (commande, demande) n'est pas bloquée.
  let siteUrl: string;
  try {
    siteUrl = await getSiteUrl();
  } catch (error) {
    report(error);
    return queueNow ? "failed" : null;
  }

  if (queueNow) {
    let ids: string[];
    try {
      ids = await queue(siteUrl);
    } catch (error) {
      report(error);
      return "failed";
    }
    if (ids.length) after(() => deliverEmails(ids).then(() => undefined, report));
    return ids.length;
  }

  after(async () => {
    try {
      await deliverEmails(await queue(siteUrl));
    } catch (error) {
      report(error);
    }
  });
  return null;
}

/** Emails d'une étape de commande (voir scheduleEmails). */
export async function scheduleOrderEmails(
  orderId: string,
  templates: OrderEmailTemplate[],
  {
    note = null,
    queueNow = false,
    dedupeSuffix,
    extra,
  }: { note?: string | null; queueNow?: boolean; dedupeSuffix?: string; extra?: OrderEmailExtra } = {},
) {
  return scheduleEmails("Emails de commande", (siteUrl) => queueOrderEmails(orderId, templates, { note, siteUrl, dedupeSuffix, extra }), queueNow);
}

type RequestRow = {
  id: string;
  reference: string;
  kind: RequestKind;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  details: Record<string, unknown> | null;
  product_name: string | null;
  contact_request_photos: { count: number }[] | null;
};

async function loadRequestContext(requestId: string, reply: string | null): Promise<RequestEmailContext | null> {
  const { data, error } = await createAdminClient()
    .from("contact_requests")
    .select("id, reference, kind, name, email, phone, subject, message, details, product_name, contact_request_photos(count)")
    .eq("id", requestId)
    .maybeSingle<RequestRow>();
  if (error) throw new Error(`Demande pour email : ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    reference: data.reference,
    kindLabel: requestKinds[data.kind]?.short ?? "Question",
    customerName: data.name,
    email: data.email,
    phone: data.phone,
    subject: data.subject,
    message: data.message,
    details: describeRequestDetails(data.kind, data.details),
    productName: data.product_name,
    photoCount: data.contact_request_photos?.[0]?.count ?? 0,
    reply: reply?.trim() || null,
  };
}

/**
 * Met en file les emails d'une demande client. Accusé de réception et alerte
 * une seule fois par demande ; chaque réponse a sa propre clé (`replyKey`,
 * générée par le formulaire de réponse) pour ne jamais partir deux fois.
 */
export async function queueRequestEmails(
  requestId: string,
  templates: RequestTemplate[],
  options: { reply?: string | null; replyKey?: string; siteUrl?: string } = {},
): Promise<string[]> {
  const request = await loadRequestContext(requestId, options.reply ?? null);
  if (!request) return [];
  const config = getEmailConfig();
  const identity = await emailIdentity(options.siteUrl);

  const rows = templates.flatMap((template) => {
    const forAdmin = template === "request_new_admin";
    if (forAdmin && !(config.provider && config.adminEmail)) return [];
    if (template === "request_reply" && (!request.reply || !options.replyKey)) return [];
    const rendered = renderRequestEmail(template, request, identity);
    return [
      {
        template,
        dedupe_key: template === "request_reply" ? `request_reply:${options.replyKey}` : `${template}:${request.id}`,
        to_email: forAdmin ? config.adminEmail! : request.email,
        to_name: forAdmin ? null : request.customerName.slice(0, 120),
        reply_to: forAdmin ? request.email : config.replyTo,
        subject: rendered.subject.slice(0, 200),
        html: rendered.html,
        text_body: rendered.text,
        contact_request_id: request.id,
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

/** Emails d'une demande client (voir scheduleEmails). */
export async function scheduleRequestEmails(
  requestId: string,
  templates: RequestTemplate[],
  { reply = null, replyKey, queueNow = false }: { reply?: string | null; replyKey?: string; queueNow?: boolean } = {},
) {
  return scheduleEmails("Emails de demande", (siteUrl) => queueRequestEmails(requestId, templates, { reply, replyKey, siteUrl }), queueNow);
}

type ReviewOrderRow = {
  id: string;
  order_number: string;
  contact_name: string | null;
  contact_email: string | null;
  customers: { full_name: string; email: string } | null;
  order_items: { product_name_snapshot: string }[] | null;
};

export type ReviewEmailExtra = {
  link?: string | null;
  linkDays?: number;
  review?: { rating: number; comment: string | null; displayName: string; consent: boolean } | null;
};

async function loadReviewContext(orderId: string, extra: ReviewEmailExtra) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("id, order_number, contact_name, contact_email, customers(full_name, email), order_items(product_name_snapshot)")
    .eq("id", orderId)
    .maybeSingle<ReviewOrderRow>();
  if (error) throw new Error(`Commande pour avis : ${error.message}`);
  if (!data) return null;
  const email = data.contact_email ?? data.customers?.email ?? null;
  if (!email) return null;
  const context: ReviewEmailContext = {
    orderId: data.id,
    orderNumber: data.order_number,
    customerName: data.contact_name ?? data.customers?.full_name ?? "Madame, Monsieur",
    productNames: [...new Set((data.order_items ?? []).map((item) => item.product_name_snapshot))],
    link: extra.link ?? null,
    linkDays: extra.linkDays ?? 30,
    rating: extra.review?.rating ?? null,
    comment: extra.review?.comment || null,
    displayName: extra.review?.displayName ?? null,
    consent: extra.review?.consent ?? false,
  };
  return { context, email };
}

/**
 * Met en file les emails d'avis d'une commande. `dedupeSuffix` distingue
 * chaque lien envoyé (un nouveau lien remplace l'ancien).
 */
export async function queueReviewEmails(
  orderId: string,
  templates: ReviewTemplate[],
  options: ReviewEmailExtra & { dedupeSuffix: string; siteUrl?: string },
): Promise<string[]> {
  const loaded = await loadReviewContext(orderId, options);
  if (!loaded) return [];
  const { context, email } = loaded;
  const config = getEmailConfig();
  const identity = await emailIdentity(options.siteUrl);

  const rows = templates.flatMap((template) => {
    const forAdmin = template === "review_new_admin";
    if (forAdmin && !(config.provider && config.adminEmail)) return [];
    const rendered = renderReviewEmail(template, context, identity);
    return [
      {
        template,
        dedupe_key: `${template}:${orderId}:${options.dedupeSuffix}`.slice(0, 200),
        to_email: forAdmin ? config.adminEmail! : email,
        to_name: forAdmin ? null : context.customerName.slice(0, 120),
        reply_to: forAdmin ? email : config.replyTo,
        subject: rendered.subject.slice(0, 200),
        html: rendered.html,
        text_body: rendered.text,
        order_id: orderId,
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

/** Emails d'avis envoyés après la réponse (voir scheduleEmails). */
export async function scheduleReviewEmails(
  orderId: string,
  templates: ReviewTemplate[],
  options: ReviewEmailExtra & { dedupeSuffix: string; queueNow?: boolean },
) {
  return scheduleEmails("Emails d'avis", (siteUrl) => queueReviewEmails(orderId, templates, { ...options, siteUrl }), options.queueNow ?? false);
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
