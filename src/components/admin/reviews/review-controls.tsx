"use client";

import { useState } from "react";
import {
  anonymizeReviewAction,
  saveReviewReplyAction,
  sendDueReviewRequestsAction,
  setReviewDelayAction,
  setReviewFeaturedAction,
  setReviewStatusAction,
} from "@/app/admin/avis/actions";
import { Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { RowMenu } from "@/components/admin/row-menu";
import { CheckIcon, CloseIcon, EyeOffIcon, MessageSquareIcon, RotateIcon, SendIcon, StarFilledIcon, StarIcon, UsersIcon } from "@/components/icons";
import { ANONYMOUS_NAME, reviewDelayChoices, type ReviewStatus } from "@/lib/reviews/form";

type ReviewRef = {
  id: string;
  status: ReviewStatus;
  featured: boolean;
  consent: boolean;
  customerName: string;
  adminReply: string | null;
};

/** Modération d'un avis : publier, masquer, refuser, répondre, mettre en avant, anonymiser. */
export function ReviewModeration({ review }: { review: ReviewRef }) {
  const { run, pending } = useAdminAction();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.adminReply ?? "");
  const [anonymizing, setAnonymizing] = useState(false);
  const status = (value: ReviewStatus) => run(setReviewStatusAction, { id: review.id, status: value, from: review.status });

  return (
    <div className="space-y-3" data-pending={pending ? "" : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        {review.status !== "displayed" && review.status !== "refused" ? (
          <button
            type="button"
            disabled={pending || !review.consent}
            title={review.consent ? undefined : "Le client n’a pas accepté que son avis soit publié."}
            onClick={() => status("displayed")}
            className={`${adminButton.small} border-green-200 text-green-800 hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {pending ? <Spinner className="size-3.5" /> : <CheckIcon className="size-3.5" />}
            Publier
          </button>
        ) : null}
        {review.status === "displayed" ? (
          <button type="button" disabled={pending} onClick={() => status("hidden")} className={adminButton.small}>
            <EyeOffIcon className="size-3.5" />
            Masquer
          </button>
        ) : null}
        {review.status === "pending" || review.status === "hidden" ? (
          <button type="button" disabled={pending} onClick={() => status("refused")} className={`${adminButton.small} text-red-700 hover:border-red-200 hover:bg-red-50`}>
            <CloseIcon className="size-3.5" />
            Refuser
          </button>
        ) : null}
        {review.status === "refused" ? (
          <button type="button" disabled={pending} onClick={() => status("pending")} className={adminButton.small}>
            <RotateIcon className="size-3.5" />
            Remettre à modérer
          </button>
        ) : null}
        {review.status === "displayed" ? (
          <button
            type="button"
            disabled={pending}
            aria-pressed={review.featured}
            onClick={() => run(setReviewFeaturedAction, { id: review.id, featured: String(!review.featured) })}
            className={`${adminButton.small} ${review.featured ? "border-honey/40 bg-honey/10 text-honey-dark" : ""}`}
          >
            {review.featured ? <StarFilledIcon className="size-3.5" /> : <StarIcon className="size-3.5" />}
            {review.featured ? "Mis en avant" : "Mettre en avant"}
          </button>
        ) : null}
        {review.status !== "refused" ? (
          <button type="button" onClick={() => setReplying((open) => !open)} aria-expanded={replying} className={adminButton.small}>
            <MessageSquareIcon className="size-3.5" />
            {review.adminReply ? "Modifier la réponse" : "Répondre"}
          </button>
        ) : null}
        {review.customerName !== ANONYMOUS_NAME ? (
          <RowMenu
            label={`Plus d’actions pour l’avis de ${review.customerName}`}
            items={[{ kind: "action", label: "Anonymiser le nom", icon: <UsersIcon className="size-4" />, onSelect: () => setAnonymizing(true) }]}
          />
        ) : null}
      </div>

      {!review.consent && review.status === "pending" ? (
        <p className="text-[12.5px] text-muted">Le client a choisi de ne pas publier cet avis : gardez-le, ou refusez-le pour le classer.</p>
      ) : null}

      {replying ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(saveReviewReplyAction, { id: review.id, reply });
            setReplying(false);
          }}
          className="space-y-2"
        >
          <label htmlFor={`reply-${review.id}`} className="block text-[12.5px] font-medium text-ink">
            Votre réponse publique <span className="font-normal text-muted">(affichée sous l’avis ; vide pour la retirer)</span>
          </label>
          <textarea
            id={`reply-${review.id}`}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={`Merci ${review.customerName.split(" ")[0]} ! …`}
            className={`${adminInput} py-2`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={adminButton.small}>
              <SendIcon className="size-3.5" />
              Enregistrer la réponse
            </button>
            <button type="button" onClick={() => setReplying(false)} className="px-2 text-[13px] text-muted hover:text-ink">
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        options={
          anonymizing
            ? {
                title: "Anonymiser cet avis ?",
                description: `Le nom « ${review.customerName} » sera remplacé par « ${ANONYMOUS_NAME} », sur le site comme ici. Utile si le client le demande. C’est définitif.`,
                confirmLabel: "Anonymiser",
                tone: "danger",
              }
            : null
        }
        onCancel={() => setAnonymizing(false)}
        onConfirm={() => {
          setAnonymizing(false);
          run(anonymizeReviewAction, { id: review.id });
        }}
      />
    </div>
  );
}

/** Délai de la demande d'avis après le retrait ou la livraison. */
export function ReviewDelaySelect({ value }: { value: number }) {
  const { run, pending } = useAdminAction();
  return (
    <label className="flex flex-wrap items-center gap-2.5 text-[13.5px] text-ink">
      Demander un avis
      <select
        value={value}
        disabled={pending}
        onChange={(event) => run(setReviewDelayAction, { value: event.target.value })}
        className={`${adminInput} h-10 w-auto min-w-[220px]`}
      >
        {reviewDelayChoices.map((days) => (
          <option key={days} value={days}>
            {days === 0 ? "jamais automatiquement" : `${days} jours après le retrait ou la livraison`}
          </option>
        ))}
      </select>
      {pending ? <Spinner className="size-4 text-muted" /> : null}
    </label>
  );
}

export function SendDueRequestsButton({ due }: { due: number }) {
  const { run, pending } = useAdminAction();
  return (
    <button type="button" disabled={pending || due === 0} onClick={() => run(sendDueReviewRequestsAction, {})} className={`${adminButton.secondary} disabled:opacity-60`}>
      {pending ? <Spinner /> : <SendIcon className="size-4" />}
      Envoyer maintenant {due ? `(${due})` : ""}
    </button>
  );
}
