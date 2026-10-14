"use client";

import {
  markEmailSentAction,
  restoreEmailAction,
  sendEmailNowAction,
  sendTestEmailAction,
  skipEmailAction,
} from "@/app/admin/emails/actions";
import { Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton } from "@/components/admin/admin-ui";
import { CheckIcon, ExternalLinkIcon, MailIcon, RotateIcon, SendIcon } from "@/components/icons";
import type { EmailStatus } from "@/data/admin/emails";
import { mailtoHref } from "@/lib/orders/messages";

export type EmailActionTarget = {
  id: string;
  status: EmailStatus;
  orderId: string | null;
  toEmail: string;
  subject: string;
  text: string;
};

/**
 * Actions sur un email de la file. Avec un service d'envoi : envoyer ou
 * réessayer. Sans : l'ouvrir tout rédigé dans sa messagerie, puis le
 * marquer comme envoyé. Dans tous les cas : l'écarter, ou le reprendre.
 */
export function EmailActions({ email, auto, compact = false }: { email: EmailActionTarget; auto: boolean; compact?: boolean }) {
  const { run, pending } = useAdminAction();
  const fields = { id: email.id, orderId: email.orderId ?? "" };
  const open = email.status === "pending" || email.status === "failed";
  const size = compact ? adminButton.small : adminButton.secondary;

  if (email.status === "skipped") {
    return (
      <button type="button" disabled={pending} onClick={() => run(restoreEmailAction, fields)} className={size}>
        {pending ? <Spinner className="size-3.5" /> : <RotateIcon className="size-3.5" />}
        Remettre à envoyer
      </button>
    );
  }
  if (!open) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "w-full"}`} data-pending={pending ? "" : undefined}>
      {auto ? (
        <button type="button" disabled={pending} onClick={() => run(sendEmailNowAction, fields)} className={compact ? adminButton.small : `${adminButton.primary} flex-1`}>
          {pending ? <Spinner className="size-3.5" /> : <SendIcon className="size-3.5" />}
          {email.status === "failed" ? "Réessayer" : "Envoyer maintenant"}
        </button>
      ) : (
        <a
          href={mailtoHref(email.toEmail, { subject: email.subject, body: email.text })}
          className={compact ? adminButton.small : `${adminButton.primary} flex-1`}
        >
          <MailIcon className="size-3.5" />
          Ouvrir dans ma messagerie
        </a>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(markEmailSentAction, fields)}
        className={size}
        title="Vous l’avez envoyé vous-même, depuis votre messagerie"
      >
        <CheckIcon className="size-3.5" />
        Marquer envoyé
      </button>
      <button type="button" disabled={pending} onClick={() => run(skipEmailAction, fields)} className={`${compact ? "px-1.5" : "px-2"} text-[13px] text-muted transition hover:text-red-700 disabled:opacity-50`}>
        Écarter
      </button>
      {auto && !compact ? (
        <a href={mailtoHref(email.toEmail, { subject: email.subject, body: email.text })} className="inline-flex items-center gap-1 px-2 text-[13px] text-muted hover:text-honey-dark">
          <ExternalLinkIcon className="size-3.5" />
          Ou depuis ma messagerie
        </a>
      ) : null}
    </div>
  );
}

export function SendTestEmailButton() {
  const { run, pending } = useAdminAction();
  return (
    <button type="button" disabled={pending} onClick={() => run(sendTestEmailAction, {})} className={adminButton.secondary}>
      {pending ? <Spinner /> : <SendIcon className="size-4" />}
      Envoyer un email de test
    </button>
  );
}
