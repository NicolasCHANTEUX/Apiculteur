import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Notice, PageHeader, Panel } from "@/components/admin/admin-ui";
import { EmailActions } from "@/components/admin/emails/email-controls";
import { EmailStatusPill, isQueued } from "@/components/admin/emails/email-status";
import { getAdminEmail } from "@/data/admin/emails";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { emailProviders, type EmailProvider } from "@/lib/email/driver";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Email" };

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] tracking-[0.06em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-[14px] break-words text-ink">{children}</dd>
    </div>
  );
}

export default async function AdminEmailPage(props: PageProps<"/admin/emails/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/emails/${id}`);
  const email = await getAdminEmail(id);
  if (!email) notFound();
  const auto = Boolean(getEmailConfig().provider);
  const now = new Date();
  const open = email.status === "pending" || email.status === "failed" || email.status === "skipped";

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/emails", label: "Emails" }]}
        title={email.subject}
        meta={
          <>
            <EmailStatusPill status={email.status} sentManually={email.sentManually} queued={isQueued(email.status, email.createdAt, auto, now)} />
            <span className="text-[13px] text-muted">{email.templateLabel}</span>
            <span className="text-[13px] text-muted">· préparé le {formatOrderDate(email.createdAt)}</span>
          </>
        }
      />

      {email.status === "failed" && email.lastError ? (
        <Notice tone="error">
          Dernier essai en échec : {email.lastError}. {auto ? "Réessayez, ou envoyez-le depuis votre messagerie." : null}
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Panel title="Aperçu" description="Tel que le reçoit le destinataire." flush>
            {/* Contenu isolé : aucun script, aucun lien actif dans l'aperçu. */}
            <iframe title="Aperçu de l’email" srcDoc={email.html} sandbox="" className="block h-[640px] w-full rounded-b-2xl bg-cream" />
          </Panel>
          <details className="group rounded-2xl border border-line/70 bg-white">
            <summary className="cursor-pointer list-none px-5 py-4 font-display text-[16px] font-semibold text-ink marker:hidden">
              Version texte <span className="font-sans text-[13px] font-normal text-muted">(pour les messageries sans mise en forme)</span>
            </summary>
            <pre className="overflow-x-auto border-t border-line/60 px-5 py-4 font-sans text-[13.5px] leading-[1.6] whitespace-pre-wrap text-body">{email.text}</pre>
          </details>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          {open ? (
            <Panel title={email.status === "skipped" ? "Email écarté" : auto ? "Envoi" : "À envoyer"}>
              {email.status !== "skipped" && !auto ? (
                <p className="mb-3 text-[13px] leading-[1.5] text-muted">
                  Ouvrez-le dans votre messagerie : le texte est prêt, il ne reste qu’à l’envoyer. Marquez-le ensuite comme envoyé.
                </p>
              ) : null}
              <EmailActions
                auto={auto}
                email={{ id: email.id, status: email.status, orderId: email.order?.id ?? null, toEmail: email.toEmail, subject: email.subject, text: email.text }}
              />
            </Panel>
          ) : null}
          <Panel title="Détails">
            <dl className="space-y-3">
              <Info label="Destinataire">
                {email.toName ? `${email.toName} · ` : ""}
                {email.toEmail}
              </Info>
              {email.replyTo ? <Info label="Réponses vers">{email.replyTo}</Info> : null}
              {email.order ? (
                <Info label="Commande">
                  <Link href={`/admin/commandes/${email.order.id}`} className="text-honey-dark hover:underline">
                    {email.order.number}
                  </Link>
                </Info>
              ) : null}
              {email.request ? (
                <Info label="Demande">
                  <Link href={`/admin/demandes/${email.request.id}`} className="text-honey-dark hover:underline">
                    {email.request.reference}
                  </Link>
                </Info>
              ) : null}
              {email.sentAt ? (
                <Info label="Envoyé le">
                  {formatOrderDate(email.sentAt)}
                  {email.sentManually ? " depuis votre messagerie" : email.provider ? ` via ${emailProviders[email.provider as EmailProvider] ?? email.provider}` : ""}
                </Info>
              ) : null}
              {email.attempts > 0 ? <Info label="Tentatives d’envoi">{email.attempts}</Info> : null}
            </dl>
          </Panel>
        </aside>
      </div>
    </main>
  );
}
