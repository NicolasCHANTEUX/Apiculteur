import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, panelClass } from "@/components/admin/admin-ui";
import { EmailActions, SendTestEmailButton } from "@/components/admin/emails/email-controls";
import { EmailStatusPill, isQueued } from "@/components/admin/emails/email-status";
import { LinkPending } from "@/components/admin/link-pending";
import { ChevronRightIcon, MailIcon } from "@/components/icons";
import { emailTabs, isEmailTab, listAdminEmails, type EmailTab } from "@/data/admin/emails";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { formatRelativeTime } from "@/lib/admin/audit-labels";
import { emailProviders } from "@/lib/email/driver";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Emails" };

function EmailSetup() {
  const config = getEmailConfig();
  if (config.provider && config.from) {
    return (
      <section className={`${panelClass} flex flex-wrap items-center justify-between gap-4 px-5 py-4`} aria-label="Service d’envoi">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-green-500 shadow-[0_0_0_4px_rgb(34_197_94/0.15)]" aria-hidden />
          <div className="min-w-0 text-[13.5px] leading-[1.55]">
            <p className="font-medium text-ink">Envoi automatique activé · {emailProviders[config.provider]}</p>
            <p className="break-words text-muted">
              Expéditeur : {config.from.name ? `${config.from.name} <${config.from.email}>` : config.from.email}
              {config.replyTo ? ` · réponses vers ${config.replyTo}` : ""}
            </p>
            <p className="break-words text-muted">
              {config.adminEmail
                ? `Alertes « nouvelle demande » envoyées à ${config.adminEmail}.`
                : "Pas d’alerte « nouvelle demande » : renseignez ADMIN_NOTIFICATION_EMAIL pour en recevoir."}
            </p>
          </div>
        </div>
        <SendTestEmailButton />
      </section>
    );
  }

  return (
    <Notice tone={config.problems.length ? "warning" : "info"}>
      <p className="font-medium text-ink">Envoi automatique pas encore configuré</p>
      <p className="mt-1">
        Les emails sont tout de même préparés ici à chaque étape : ouvrez-les dans votre messagerie en un clic, envoyez-les, puis marquez-les
        comme envoyés. Pour qu’ils partent tout seuls, choisissez un service d’envoi (Brevo ou Resend) et renseignez ses réglages
        sur l’hébergement : EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO et ADMIN_NOTIFICATION_EMAIL.
      </p>
      {config.problems.length ? (
        <ul className="mt-2 list-disc pl-5">
          {config.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  );
}

export default async function AdminEmailsPage(props: PageProps<"/admin/emails">) {
  await requireAdmin("/admin/emails");
  const params = await props.searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const tab: EmailTab = isEmailTab(statut) ? statut : "a-traiter";
  const { emails, counts, missingTable } = await listAdminEmails(tab);
  const auto = Boolean(getEmailConfig().provider);
  const now = new Date();

  return (
    <main className="space-y-6">
      <PageHeader
        title="Emails"
        description="Les emails envoyés à vos clients à chaque étape de leur commande, et vos alertes de nouvelle demande."
      />

      {missingTable ? (
        <Notice tone="warning">
          <p className="font-medium text-ink">Dernière étape d’installation : la file d’emails n’existe pas encore dans la base</p>
          <p className="mt-1">
            Appliquez la migration <code className="rounded bg-orange-100 px-1">20261014120000_email_outbox.sql</code> dans l’éditeur SQL
            de Supabase. En attendant, aucun email n’est préparé ; les commandes fonctionnent normalement.
          </p>
        </Notice>
      ) : (
        <EmailSetup />
      )}

      <section className={panelClass} aria-label="Journal des emails">
        <nav aria-label="Filtrer par état" className="overflow-x-auto border-b border-line/60">
          <ul className="flex min-w-max gap-1 px-3 pt-2 sm:px-4">
            {(Object.keys(emailTabs) as EmailTab[]).map((value) => {
              const current = value === tab;
              return (
                <li key={value}>
                  <Link
                    href={`/admin/emails?statut=${value}`}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-2 px-3 text-[13.5px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                      current ? "text-ink after:bg-honey" : "text-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    {emailTabs[value]}
                    <span
                      className={`rounded-full px-1.5 py-px text-[11.5px] tabular-nums ${
                        value === "a-traiter" && counts[value] > 0 ? "bg-honey text-white" : current ? "bg-honey/15 text-honey-dark" : "bg-sand text-muted"
                      }`}
                    >
                      {counts[value]}
                    </span>
                    <LinkPending className="-ml-1 text-honey" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {emails.length === 0 ? (
          <EmptyState icon={<MailIcon className="size-5" />} title={tab === "a-traiter" ? "Rien à envoyer" : "Aucun email ici"}>
            {tab === "a-traiter"
              ? "Les emails à envoyer ou en échec apparaîtront ici."
              : "Les emails sont préparés quand une demande arrive et à chaque étape de la commande."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {emails.map((email) => (
              <li key={email.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5 sm:px-5">
                <Link href={`/admin/emails/${email.id}`} className="group flex min-w-0 flex-[1_1_320px] items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sand text-brown" aria-hidden>
                    <MailIcon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink group-hover:text-honey-dark">{email.subject}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      À {email.toName ? `${email.toName} · ` : ""}
                      {email.toEmail} ·{" "}
                      <time dateTime={email.createdAt} title={formatOrderDate(email.createdAt)}>
                        {formatRelativeTime(email.createdAt, now)}
                      </time>
                    </span>
                    {email.status === "failed" && email.lastError ? (
                      <span className="mt-0.5 block text-[12.5px] text-red-700">
                        {email.lastError} ({email.attempts} tentative{email.attempts > 1 ? "s" : ""})
                      </span>
                    ) : null}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-muted">{email.templateLabel}</span>
                  <EmailStatusPill status={email.status} sentManually={email.sentManually} queued={isQueued(email.status, email.createdAt, auto, now)} />
                </div>
                {email.text || email.status === "skipped" ? (
                  <EmailActions
                    compact
                    auto={auto}
                    email={{ id: email.id, status: email.status, orderId: email.order?.id ?? null, toEmail: email.toEmail, subject: email.subject, text: email.text ?? "" }}
                  />
                ) : (
                  <Link href={`/admin/emails/${email.id}`} className="hidden text-parchment hover:text-honey sm:block" aria-label="Voir l’email">
                    <ChevronRightIcon className="size-4" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
