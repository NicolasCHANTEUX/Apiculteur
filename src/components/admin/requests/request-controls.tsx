"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  deleteRequestForeverAction,
  replyToRequestAction,
  restoreRequestAction,
  saveRequestNoteAction,
  setRequestStatusAction,
  trashRequestAction,
} from "@/app/admin/demandes/actions";
import { ActionButton, Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { useToast } from "@/components/admin/toast";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, RotateIcon, SendIcon, TrashIcon } from "@/components/icons";
import { requestStatuses, type RequestStatus } from "@/lib/requests/form";

type RequestRef = { id: string; version: string };

/** Statut en un clic, avec contrôle de conflit côté serveur. */
export function RequestStatusSwitch({ request, status: saved }: { request: RequestRef; status: RequestStatus }) {
  const { run, pending } = useAdminAction();
  const [status, setStatus] = useOptimistic(saved);
  return (
    <div role="radiogroup" aria-label="Statut de la demande" className="grid grid-cols-2 gap-1.5" data-pending={pending ? "" : undefined}>
      {(Object.keys(requestStatuses) as RequestStatus[]).map((value) => {
        const active = value === status;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => {
              if (active) return;
              run(setRequestStatusAction, { id: request.id, version: request.version, status: value }, { before: () => setStatus(value) });
            }}
            className={`min-h-10 rounded-lg border px-2 text-[13px] font-medium transition disabled:cursor-wait ${
              active ? "border-honey bg-honey/12 text-honey-dark" : "border-line bg-white text-body hover:border-parchment hover:bg-cream"
            }`}
          >
            {requestStatuses[value]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Réponse au client : partie tout de suite avec un service d'envoi, sinon
 * préparée pour la messagerie. Une clé par réponse : un double clic
 * n'envoie jamais deux emails.
 */
export function ReplyComposer({ request, customerName, auto }: { request: RequestRef; customerName: string; auto: boolean }) {
  const toast = useToast();
  const greeting = `Bonjour ${customerName},\n\n`;
  const [reply, setReply] = useState(greeting);
  const [pending, startTransition] = useTransition();
  const keyRef = useRef<string | null>(null);
  const ready = reply.trim().length > greeting.trim().length + 4;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        keyRef.current ??= crypto.randomUUID();
        const formData = new FormData();
        formData.set("id", request.id);
        formData.set("reply", reply);
        formData.set("replyKey", keyRef.current);
        startTransition(async () => {
          const result = await replyToRequestAction(formData);
          if (result.status === "error") {
            toast.show("error", result.message);
            return;
          }
          toast.show("success", result.message);
          keyRef.current = null;
          setReply(greeting);
        });
      }}
      className="space-y-3"
    >
      <label htmlFor="reply" className="sr-only">
        Votre réponse
      </label>
      <textarea
        id="reply"
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        rows={7}
        maxLength={5000}
        className={`${adminInput} py-2.5 leading-[1.6]`}
      />
      <p className="text-[12px] text-muted">
        Votre signature et le message du client sont ajoutés automatiquement en dessous.
      </p>
      <button type="submit" disabled={pending || !ready} className={`${adminButton.primary} w-full disabled:opacity-60`}>
        {pending ? <Spinner /> : <SendIcon className="size-4" />}
        {auto ? "Envoyer la réponse" : "Préparer la réponse"}
      </button>
      {!auto ? (
        <p className="text-[12px] text-muted">
          Sans service d’envoi configuré, la réponse s’ouvre ensuite dans votre messagerie depuis le panneau « Emails ».
        </p>
      ) : null}
    </form>
  );
}

export function RequestNote({ id, initial }: { id: string; initial: string }) {
  const { run, pending } = useAdminAction();
  const [note, setNote] = useState(initial);
  const changed = note.trim() !== initial.trim();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(saveRequestNoteAction, { id, note });
      }}
      className="space-y-2.5"
    >
      <label htmlFor="request-note" className="sr-only">
        Note interne
      </label>
      <textarea
        id="request-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Visible uniquement dans l’administration : rappel, suite donnée…"
        className={`${adminInput} py-2.5`}
      />
      {changed ? (
        <button type="submit" disabled={pending} className={adminButton.small}>
          {pending ? <Spinner className="size-3.5" /> : null}
          Enregistrer la note
        </button>
      ) : null}
    </form>
  );
}

/** Corbeille : mettre de côté, restaurer, ou supprimer définitivement. */
export function TrashControls({ id, trashed, reference }: { id: string; trashed: boolean; reference: string }) {
  if (!trashed) {
    return (
      <ActionButton
        action={trashRequestAction}
        fields={{ id }}
        className={`${adminButton.ghost} text-muted hover:text-red-700`}
        confirm={{
          title: `Mettre ${reference} à la corbeille ?`,
          description: "Elle disparaît de la boîte de réception, mais reste restaurable avec ses photos depuis l’onglet Corbeille.",
          confirmLabel: "Mettre à la corbeille",
        }}
      >
        <TrashIcon className="size-4" />
        Corbeille
      </ActionButton>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton action={restoreRequestAction} fields={{ id }} className={adminButton.secondary}>
        <RotateIcon className="size-4" />
        Restaurer
      </ActionButton>
      <ActionButton
        action={deleteRequestForeverAction}
        fields={{ id, from: "detail" }}
        className={adminButton.danger}
        confirm={{
          title: `Supprimer ${reference} définitivement ?`,
          description: "La demande, ses photos et son historique d’emails liés disparaissent. Cette action est irréversible.",
          confirmLabel: "Supprimer définitivement",
          tone: "danger",
        }}
      >
        <TrashIcon className="size-4" />
        Supprimer définitivement
      </ActionButton>
    </div>
  );
}

/** Photos de la demande, ouvertes en grand (flèches du clavier, Échap). */
export function RequestPhotos({ photos }: { photos: { id: string; width: number | null; height: number | null }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const count = photos.length;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  const go = (delta: number) => setOpen((index) => (index === null ? null : (index + delta + count) % count));

  return (
    <>
      <ul className="grid grid-cols-3 gap-2.5">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group block aspect-square w-full overflow-hidden rounded-xl bg-sand ring-honey/40 transition focus-visible:ring-2"
              aria-label={`Agrandir la photo ${index + 1} sur ${count}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/admin/demandes/photo/${photo.id}`} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-[1.03]" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        aria-label="Photo de la demande"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(1);
          if (event.key === "ArrowLeft") go(-1);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(null);
        }}
        className="m-auto max-h-[92vh] max-w-[min(1100px,94vw)] bg-transparent p-0 backdrop:bg-espresso/80 backdrop:backdrop-blur-sm"
      >
        {open !== null ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/admin/demandes/photo/${photos[open].id}`}
              alt={`Photo ${open + 1} sur ${count}`}
              className="block max-h-[88vh] w-auto max-w-full rounded-xl object-contain"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <span className="rounded-full bg-espresso/80 px-2.5 py-1 text-[12px] text-white tabular-nums">
                {open + 1} / {count}
              </span>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="flex size-8 items-center justify-center rounded-full bg-espresso/80 text-white transition hover:bg-espresso"
                aria-label="Fermer"
                autoFocus
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/70 text-white transition hover:bg-espresso"
                  aria-label="Photo précédente"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-espresso/70 text-white transition hover:bg-espresso"
                  aria-label="Photo suivante"
                >
                  <ChevronRightIcon className="size-5" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
