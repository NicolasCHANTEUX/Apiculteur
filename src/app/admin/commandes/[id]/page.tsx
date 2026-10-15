import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, Notice, PageHeader, Panel, adminButton } from "@/components/admin/admin-ui";
import { EmailActions } from "@/components/admin/emails/email-controls";
import { EmailStatusPill, isQueued } from "@/components/admin/emails/email-status";
import { DeliveryFeeEditor, OrderActions, OrderNote, OrderStatePill, RequestReviewButton } from "@/components/admin/orders/order-controls";
import { ProposalTermsCard } from "@/components/admin/orders/proposal-terms";
import { Stars } from "@/components/ui";
import { formatPrice } from "@/components/catalog/product-display";
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
} from "@/components/icons";
import { listOrderEmails } from "@/data/admin/emails";
import { getAdminOrder } from "@/data/admin/orders";
import { getOrderReview } from "@/data/admin/reviews";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { formatOrderDate, paymentLabels, type OrderStateKey } from "@/lib/orders/labels";
import { reviewStatusLabels } from "@/lib/reviews/form";
import { customerEmailDraft, mailtoHref } from "@/lib/orders/messages";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Commande" };

const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const progress: { key: OrderStateKey[]; label: string }[] = [
  { key: ["to_validate", "proposed", "preparing", "ready", "shipped", "done"], label: "Reçue" },
  { key: ["preparing", "ready", "shipped", "done"], label: "Acceptée" },
  { key: ["ready", "shipped", "done"], label: "Prête" },
  { key: ["done"], label: "Terminée" },
];

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] tracking-[0.06em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{children}</dd>
    </div>
  );
}

const proposalNotices: Record<string, string> = {
  envoyee: "Proposition envoyée au client : il l’accepte ou la décline depuis le lien reçu par email. Vous serez prévenu de sa réponse.",
  preparee: "Proposition enregistrée : l’email avec le lien de réponse est prêt dans le panneau Emails, à envoyer depuis votre messagerie.",
  enregistree: "Proposition enregistrée, sans email : appliquez-la quand le client vous a donné son accord.",
};

export default async function AdminOrderPage(props: PageProps<"/admin/commandes/[id]">) {
  const { id } = await props.params;
  const query = await props.searchParams;
  const proposalNotice = typeof query.proposition === "string" ? proposalNotices[query.proposition] : undefined;
  await requireAdmin(`/admin/commandes/${id}`);
  const [order, emails, orderReview] = await Promise.all([getAdminOrder(id), listOrderEmails(id), getOrderReview(id)]);
  if (!order) notFound();
  const autoEmail = Boolean(getEmailConfig().provider);
  const now = new Date();

  const ref = { id: order.id, version: order.updatedAt, number: order.orderNumber };
  const stopped = order.state.key === "refused" || order.state.key === "cancelled";
  const shortStock = order.state.key === "to_validate"
    ? order.lines.filter((line) => line.currentStock !== null && line.currentStock < line.quantity)
    : [];
  const draft = customerEmailDraft({
    number: order.orderNumber,
    customerName: order.customer.name,
    state: order.state.key,
    lines: order.lines.map((line) => ({ name: line.name, quantity: line.quantity })),
    signature: site.owner.firstName,
  });
  const priceToConfirm = order.lines.some((line) => line.unitPrice === 0);

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/commandes", label: "Commandes" }]}
        title={order.orderNumber}
        meta={
          <>
            <OrderStatePill state={order.state} />
            {order.source === "manual" ? <Badge tone="honey">Vente manuelle</Badge> : null}
            <span className="text-[13px] text-muted">{paymentLabels[order.paymentStatus]}{order.paymentMethod ? ` (${order.paymentMethod})` : ""}</span>
            <span className="text-[13px] text-muted">· {order.source === "manual" ? "saisie" : "reçue"} le {formatOrderDate(order.createdAt)}</span>
          </>
        }
        actions={
          order.customer.email ? (
            <a href={mailtoHref(order.customer.email, draft)} className={adminButton.secondary}>
              <MailIcon className="size-4" />
              Écrire au client
            </a>
          ) : null
        }
      />

      {query.vente === "enregistree" ? <Notice tone="success">Vente enregistrée : le stock a été mis à jour.</Notice> : null}
      {proposalNotice ? <Notice tone="success">{proposalNotice}</Notice> : null}

      {stopped ? (
        <Notice tone={order.state.key === "refused" ? "error" : "info"}>
          {order.state.key === "refused" ? "Demande refusée" : "Commande annulée"}
          {order.decisionNote ? ` : ${order.decisionNote}` : "."}
        </Notice>
      ) : (
        <ol className="grid grid-cols-4 gap-2" aria-label="Avancement">
          {progress.map((step, index) => {
            // Livraison : l'étape « prête » devient « expédiée ».
            const label = step.label === "Prête" && order.deliveryMethod === "delivery" ? "Expédiée" : step.label;
            const done = step.key.includes(order.state.key);
            return (
              <li key={step.label} className="space-y-2">
                <div className={`h-1.5 rounded-full ${done ? "bg-honey" : "bg-line"}`} />
                <p className={`flex items-center gap-1.5 text-[12.5px] ${done ? "font-medium text-ink" : "text-muted"}`}>
                  {done ? <CheckIcon className="size-3.5 text-honey" /> : <span className="text-[11px] tabular-nums">{index + 1}.</span>}
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {order.proposal ? (
            <Panel
              title="Proposition envoyée"
              description={
                order.proposal.linkSent
                  ? Date.parse(order.proposal.expiresAt) > now.getTime()
                    ? `Le ${formatOrderDate(order.proposal.createdAt)}, avec un lien de réponse valable jusqu’au ${formatOrderDate(order.proposal.expiresAt)}.`
                    : `Le ${formatOrderDate(order.proposal.createdAt)} ; le lien a expiré sans réponse : appliquez-la, retirez-la ou refusez la demande.`
                  : `Le ${formatOrderDate(order.proposal.createdAt)}, sans lien : appliquez-la quand le client a donné son accord.`
              }
            >
              {order.proposal.message ? (
                <blockquote className="mb-4 border-l-2 border-honey/50 pl-4 text-[14px] leading-[1.6] whitespace-pre-line text-body">{order.proposal.message}</blockquote>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <ProposalTermsCard title="Demande d’origine" terms={order.proposal.previous} />
                <ProposalTermsCard title="Proposition" terms={order.proposal.proposed} highlight />
              </div>
            </Panel>
          ) : null}

          <Panel
            title={order.source === "manual" ? "Produits vendus" : order.proposal ? "Produits demandés (en attendant la réponse)" : "Produits demandés"}
            actions={
              order.reviewReasons.length ? (
                <span className="flex flex-wrap gap-1">
                  {order.reviewReasons.map((reason) => (
                    <Badge key={reason} tone={reason.startsWith("Grande") ? "warning" : "neutral"}>
                      {reason}
                    </Badge>
                  ))}
                </span>
              ) : null
            }
            flush
          >
            <ul className="divide-y divide-line/60">
              {order.lines.map((line) => {
                const short = line.currentStock !== null && line.currentStock < line.quantity && order.state.key === "to_validate";
                return (
                  <li key={line.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5">
                    <div className="min-w-0">
                      <Link href={`/admin/produits/${line.productId}`} className="font-medium text-ink hover:text-honey-dark">
                        {line.name}
                      </Link>
                      <p className="text-[12.5px] text-muted">
                        {line.quantity} × {line.unitPrice > 0 ? formatPrice(line.unitPrice) : "prix à confirmer"}
                        {line.currentStock !== null ? (
                          <span className={short ? "font-medium text-red-700" : ""}> · stock actuel {line.currentStock}</span>
                        ) : line.purchaseMode ? (
                          <span> · {line.purchaseMode === "reservation" ? "réservation" : "sur devis"}, sans stock décompté</span>
                        ) : null}
                      </p>
                    </div>
                    <p className="font-semibold text-ink tabular-nums">{line.lineTotal > 0 ? formatPrice(line.lineTotal) : "—"}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-line/60 bg-cream/50 px-5 py-4 text-[14px]">
              <div className="flex justify-between gap-4 text-body">
                <dt>Sous-total</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-body">
                <dt>{order.deliveryMethod === "delivery" ? "Livraison" : "Retrait"}</dt>
                <dd>
                  {order.deliveryMethod === "delivery" && order.paymentStatus !== "paid" && !(order.state.key === "done" || stopped) && !order.proposal ? (
                    <DeliveryFeeEditor order={ref} fee={order.deliveryFee} />
                  ) : order.deliveryMethod === "pickup" ? (
                    "gratuit"
                  ) : order.deliveryFee > 0 ? (
                    formatPrice(order.deliveryFee)
                  ) : (
                    "à convenir"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-[16px] font-semibold text-ink">
                <dt>Total {priceToConfirm ? "(hors prix à confirmer)" : ""}</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          {shortStock.length ? (
            <Notice tone="warning">
              Stock insuffisant pour {shortStock.map((line) => `« ${line.name} »`).join(", ")} : ajustez le stock du produit avant d’accepter, ou
              contactez le client pour modifier la demande.
            </Notice>
          ) : null}

          {order.message ? (
            <Panel title="Message du client">
              <blockquote className="border-l-2 border-honey/50 pl-4 text-[14.5px] leading-[1.65] whitespace-pre-line text-body">{order.message}</blockquote>
            </Panel>
          ) : null}

          <Panel
            title="Emails"
            description={autoEmail ? "Envoyés automatiquement à chaque étape." : "Préparés à chaque étape : à envoyer depuis votre messagerie."}
            flush
          >
            {emails.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">
                {order.customer.email ? "Aucun email pour cette commande." : "Pas d’email : le client n’a pas laissé d’adresse."}
              </p>
            ) : (
              <ul className="divide-y divide-line/60">
                {emails.map((email) => (
                  <li key={email.id} className="space-y-2.5 px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                      <Link href={`/admin/emails/${email.id}`} className="group min-w-0">
                        <span className="block font-medium text-ink group-hover:text-honey-dark">{email.templateLabel}</span>
                        <span className="block text-[12.5px] text-muted">
                          {email.toEmail} · {formatOrderDate(email.sentAt ?? email.createdAt)}
                        </span>
                      </Link>
                      <EmailStatusPill status={email.status} sentManually={email.sentManually} queued={isQueued(email.status, email.createdAt, autoEmail, now)} />
                    </div>
                    {email.status === "failed" && email.lastError ? <p className="text-[12.5px] text-red-700">{email.lastError}</p> : null}
                    {(email.text && (email.status === "pending" || email.status === "failed")) || email.status === "skipped" ? (
                      <EmailActions
                        compact
                        auto={autoEmail}
                        email={{ id: email.id, status: email.status, orderId: order.id, toEmail: email.toEmail, subject: email.subject, text: email.text ?? "" }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {order.state.key === "done" ? (
            <Panel title="Avis du client">
              {orderReview.review ? (
                <p className="flex flex-wrap items-center gap-2 text-[14px] text-body">
                  <Stars rating={orderReview.review.rating} className="text-[13px]" />
                  <span>
                    Avis de <span className="font-medium text-ink">{orderReview.review.customerName}</span> ·{" "}
                    {reviewStatusLabels[orderReview.review.status].toLowerCase()}
                  </span>
                  <Link href="/admin/avis?statut=tous" className="font-medium text-honey-dark hover:underline">
                    Voir dans Avis
                  </Link>
                </p>
              ) : !order.customer.email ? (
                <p className="text-[13.5px] text-muted">Pas de demande d’avis possible : le client n’a pas d’email.</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13.5px] text-body">
                    {orderReview.invitation?.sentAt
                      ? orderReview.invitation.expiresAt && Date.parse(orderReview.invitation.expiresAt) > now.getTime()
                        ? `Demande envoyée le ${formatOrderDate(orderReview.invitation.sentAt)} ; lien valable jusqu’au ${formatOrderDate(orderReview.invitation.expiresAt)}.`
                        : `Demande envoyée le ${formatOrderDate(orderReview.invitation.sentAt)} ; le lien a expiré sans réponse.`
                      : orderReview.invitation
                        ? `Demande d’avis prévue le ${formatOrderDate(orderReview.invitation.sendAfter)}.`
                        : "Aucune demande d’avis pour cette commande."}
                  </p>
                  <RequestReviewButton orderId={order.id} number={order.orderNumber} resend={Boolean(orderReview.invitation?.sentAt)} />
                </div>
              )}
            </Panel>
          ) : null}

          <Panel title="Historique">
            {order.history.length === 0 ? (
              <p className="text-[13.5px] text-muted">Aucun événement enregistré.</p>
            ) : (
              <ol>
                {order.history.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < order.history.length - 1 ? <span className="absolute top-4 bottom-0 left-[5px] w-px bg-line" aria-hidden /> : null}
                    <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-honey bg-white" aria-hidden />
                    <div className="text-[13.5px] leading-[1.45]">
                      <p className="font-medium text-ink">{event.label}</p>
                      {event.detail ? <p className="text-body">« {event.detail} »</p> : null}
                      <p className="text-[12px] text-muted">{formatOrderDate(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          {!(order.state.key === "done" || stopped) ? (
            <Panel title="Actions">
              <OrderActions
                order={ref}
                state={order.state.key}
                paymentStatus={order.paymentStatus}
                canNotify={Boolean(order.customer.email)}
                deliveryMethod={order.deliveryMethod}
                proposalId={order.proposal?.id ?? null}
              />
            </Panel>
          ) : null}

          <Panel title="Client">
            <dl className="space-y-3">
              <Info label="Nom">
                {order.customer.id ? (
                  <Link href={`/admin/clients/${order.customer.id}`} className="text-honey-dark hover:underline">
                    {order.customer.name}
                  </Link>
                ) : (
                  order.customer.name
                )}
              </Info>
              {order.customer.companyName ? <Info label="Exploitation ou entreprise">{order.customer.companyName}</Info> : null}
              {order.customer.professionalId ? <Info label="Identifiant professionnel">{order.customer.professionalId}</Info> : null}
              {order.customer.email ? (
                <Info label="Email">
                  <a href={mailtoHref(order.customer.email, draft)} className="inline-flex items-center gap-1.5 break-all text-honey-dark hover:underline">
                    <MailIcon className="size-3.5 shrink-0" />
                    {order.customer.email}
                  </a>
                </Info>
              ) : null}
              {order.customer.phone ? (
                <Info label="Téléphone">
                  <a href={`tel:${order.customer.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-honey-dark hover:underline">
                    <PhoneIcon className="size-3.5" />
                    {order.customer.phone}
                  </a>
                </Info>
              ) : null}
            </dl>
            <p className="mt-4 border-t border-line/60 pt-3 text-[12.5px] text-muted">
              {!order.customer.id
                ? "Client de passage : pas de fiche client."
                : order.customer.otherOrders > 0
                  ? `${order.customer.otherOrders} autre${order.customer.otherOrders > 1 ? "s" : ""} commande${order.customer.otherOrders > 1 ? "s" : ""} pour ce client`
                  : "Première commande de ce client"}
            </p>
          </Panel>

          <Panel title="Retrait ou livraison">
            <dl className="space-y-3">
              <Info label="Mode">
                <span className="inline-flex items-center gap-1.5">
                  {order.deliveryMethod === "delivery" ? <TruckIcon className="size-4 text-honey" /> : <MapPinIcon className="size-4 text-honey" />}
                  {order.deliveryMethod === "delivery"
                    ? order.delivery.zoneName
                      ? "Livraison"
                      : "Livraison à organiser (sur devis)"
                    : "Retrait sur l’exploitation"}
                </span>
              </Info>
              {order.address ? (
                <Info label="Adresse">
                  {order.address.line1}
                  <br />
                  {order.address.postalCode} {order.address.city}
                </Info>
              ) : null}
              {order.deliveryMethod === "delivery" ? (
                <Info label="Distance">
                  {order.delivery.distanceKm !== null ? (
                    <span>
                      {Math.round(order.delivery.distanceKm)} km à vol d’oiseau
                      {order.delivery.zoneName ? <span className="text-muted"> · zone « {order.delivery.zoneName} »</span> : <span className="text-muted"> · hors zone, sur devis</span>}
                    </span>
                  ) : (
                    <span className="text-muted">Non calculée (adresse non localisée ou exploitation sans adresse)</span>
                  )}
                  {order.delivery.lat !== null && order.delivery.lng !== null ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${order.delivery.lat}&mlon=${order.delivery.lng}#map=12/${order.delivery.lat}/${order.delivery.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-[13px] font-medium text-honey-dark hover:underline"
                    >
                      Voir sur la carte
                    </a>
                  ) : null}
                </Info>
              ) : null}
              <Info label="Date souhaitée">
                {order.requestedDate ? (
                  <span className="inline-flex items-center gap-1.5 first-letter:uppercase">
                    <ClockIcon className="size-4 text-honey" />
                    {longDate.format(new Date(`${order.requestedDate}T12:00:00Z`))}
                  </span>
                ) : (
                  <span className="text-muted">Non précisée</span>
                )}
              </Info>
            </dl>
          </Panel>

          <Panel title="Note interne" description="Jamais visible par le client.">
            <OrderNote key={order.internalNote ?? ""} order={ref} initial={order.internalNote ?? ""} />
          </Panel>

          {(order.state.key === "to_validate" || order.state.key === "proposed") && !order.customer.email ? (
            <p className="flex items-center gap-2 text-[12.5px] text-orange-800">
              <AlertTriangleIcon className="size-4" /> Aucun email pour ce client.
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
