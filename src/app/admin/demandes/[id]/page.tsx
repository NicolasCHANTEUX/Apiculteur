import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Notice, PageHeader, Panel } from "@/components/admin/admin-ui";
import { EmailActions } from "@/components/admin/emails/email-controls";
import { EmailStatusPill, isQueued } from "@/components/admin/emails/email-status";
import { ReplyComposer, RequestNote, RequestPhotos, RequestStatusSwitch, TrashControls } from "@/components/admin/requests/request-controls";
import { RequestKindBadge, RequestStatusPill } from "@/components/admin/requests/request-status";
import { MailIcon, PackageIcon, PhoneIcon } from "@/components/icons";
import { getAdminRequest } from "@/data/admin/requests";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Demande" };

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] tracking-[0.06em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-[14px] break-words text-ink">{children}</dd>
    </div>
  );
}

export default async function AdminRequestPage(props: PageProps<"/admin/demandes/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/demandes/${id}`);
  const request = await getAdminRequest(id);
  if (!request) notFound();
  const auto = Boolean(getEmailConfig().provider);
  const now = new Date();
  const trashed = request.deletedAt !== null;
  const ref = { id: request.id, version: request.updatedAt };

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: trashed ? "/admin/demandes?statut=corbeille" : "/admin/demandes", label: "Demandes" }]}
        title={request.subject}
        meta={
          <>
            <RequestStatusPill status={request.status} />
            <RequestKindBadge kind={request.kind} />
            <span className="text-[13px] text-muted">
              {request.reference} · reçue le {formatOrderDate(request.createdAt)}
            </span>
          </>
        }
        actions={<TrashControls id={request.id} trashed={trashed} reference={request.reference} />}
      />

      {trashed ? (
        <Notice tone="info">
          Dans la corbeille depuis le {formatOrderDate(request.deletedAt!)}. Restaurez-la pour la traiter, ou supprimez-la définitivement.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Panel title="Message">
            <blockquote className="border-l-2 border-honey/50 pl-4 text-[15px] leading-[1.7] whitespace-pre-line text-body">{request.message}</blockquote>
            {request.details.length || request.productName ? (
              <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line/60 pt-4 sm:grid-cols-2">
                {request.productName ? (
                  <Info label="Produit">
                    {request.productId ? (
                      <Link href={`/admin/produits/${request.productId}`} className="inline-flex items-center gap-1.5 text-honey-dark hover:underline">
                        <PackageIcon className="size-3.5" />
                        {request.productName}
                      </Link>
                    ) : (
                      request.productName
                    )}
                  </Info>
                ) : null}
                {request.details.map(([label, value]) => (
                  <Info key={label} label={label}>
                    {value}
                  </Info>
                ))}
              </dl>
            ) : null}
          </Panel>

          {request.photos.length ? (
            <Panel title={`Photos (${request.photos.length})`} description="Visibles uniquement dans l’administration.">
              <RequestPhotos photos={request.photos} />
            </Panel>
          ) : null}

          {!trashed ? (
            <Panel
              title="Répondre"
              description={auto ? `La réponse part par email à ${request.email}.` : "La réponse est préparée pour votre messagerie."}
            >
              <ReplyComposer key={request.answeredAt ?? "none"} request={ref} customerName={request.name} auto={auto} />
            </Panel>
          ) : null}

          <Panel title="Emails" flush>
            {request.emails.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">Aucun email pour cette demande.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {request.emails.map((email) => (
                  <li key={email.id} className="space-y-2.5 px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                      <Link href={`/admin/emails/${email.id}`} className="group min-w-0">
                        <span className="block font-medium text-ink group-hover:text-honey-dark">{email.templateLabel}</span>
                        <span className="block text-[12.5px] text-muted">
                          {email.toEmail} · {formatOrderDate(email.sentAt ?? email.createdAt)}
                        </span>
                      </Link>
                      <EmailStatusPill status={email.status} sentManually={email.sentManually} queued={isQueued(email.status, email.createdAt, auto, now)} />
                    </div>
                    {email.status === "failed" && email.lastError ? <p className="text-[12.5px] text-red-700">{email.lastError}</p> : null}
                    {(email.text && (email.status === "pending" || email.status === "failed")) || email.status === "skipped" ? (
                      <EmailActions
                        compact
                        auto={auto}
                        email={{ id: email.id, status: email.status, orderId: null, toEmail: email.toEmail, subject: email.subject, text: email.text ?? "" }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Historique">
            {request.history.length === 0 ? (
              <p className="text-[13.5px] text-muted">Aucun événement enregistré.</p>
            ) : (
              <ol>
                {request.history.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < request.history.length - 1 ? <span className="absolute top-4 bottom-0 left-[5px] w-px bg-line" aria-hidden /> : null}
                    <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-honey bg-white" aria-hidden />
                    <div className="text-[13.5px] leading-[1.45]">
                      <p className="font-medium text-ink">{event.label}</p>
                      <p className="text-[12px] text-muted">{formatOrderDate(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          {!trashed ? (
            <Panel title="Statut">
              <RequestStatusSwitch key={request.updatedAt} request={ref} status={request.status} />
            </Panel>
          ) : null}

          <Panel title="Contact">
            <dl className="space-y-3">
              <Info label="Nom">{request.name}</Info>
              <Info label="Email">
                <a
                  href={`mailto:${request.email}?subject=${encodeURIComponent(`Re : ${request.subject}`)}`}
                  className="inline-flex items-center gap-1.5 break-all text-honey-dark hover:underline"
                >
                  <MailIcon className="size-3.5 shrink-0" />
                  {request.email}
                </a>
              </Info>
              {request.phone ? (
                <Info label="Téléphone">
                  <a href={`tel:${request.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-honey-dark hover:underline">
                    <PhoneIcon className="size-3.5" />
                    {request.phone}
                  </a>
                </Info>
              ) : null}
            </dl>
            <p className="mt-4 border-t border-line/60 pt-3 text-[12px] text-muted">
              Consentement donné le {formatOrderDate(request.consentAt)} : ces informations servent uniquement à répondre.
            </p>
          </Panel>

          <Panel title="Note interne" description="Jamais visible par le client.">
            <RequestNote key={request.adminNote ?? ""} id={request.id} initial={request.adminNote ?? ""} />
          </Panel>
        </aside>
      </div>
    </main>
  );
}
