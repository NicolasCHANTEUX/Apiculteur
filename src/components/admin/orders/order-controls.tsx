"use client";

import { useEffect, useOptimistic, useRef, useState } from "react";
import {
  acceptOrderAction,
  advanceOrderAction,
  cancelOrderAction,
  markOrderPaidAction,
  saveOrderNoteAction,
  setOrdersOpenAction,
} from "@/app/admin/commandes/actions";
import { Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CheckIcon, CloseIcon, CoinsIcon, PackageIcon } from "@/components/icons";
import type { OrderStateKey, PaymentStatus } from "@/lib/orders/labels";

// Interrupteur « Demandes en ligne ». Ouvrir demande confirmation : les
// visiteurs pourront alors envoyer leurs demandes depuis le panier.
export function OrdersOpenSwitch({ open: saved }: { open: boolean }) {
  const { run, pending } = useAdminAction();
  const [asking, setAsking] = useState(false);
  // Bascule immédiate à l'écran ; revient à la valeur enregistrée si le
  // serveur refuse.
  const [open, setOpen] = useOptimistic(saved);
  const toggle = (next: boolean) => run(setOrdersOpenAction, { open: String(next) }, { before: () => setOpen(next) });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 shadow-[0_1px_2px_rgb(61_43_26/0.05)]">
      <div className="text-[13px] leading-tight">
        <p className="font-medium text-ink">Demandes en ligne</p>
        <p className={open ? "text-green-700" : "text-muted"}>{open ? "Ouvertes aux visiteurs" : "Fermées (contact par email)"}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-label="Recevoir les demandes de commande en ligne"
        disabled={pending}
        onClick={() => (open ? toggle(false) : setAsking(true))}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${open ? "bg-green-600" : "bg-line"}`}
      >
        <span
          className={`absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform ${open ? "translate-x-5" : ""}`}
        >
          {pending ? <Spinner className="size-3 text-muted" /> : null}
        </span>
      </button>
      <ConfirmDialog
        options={
          asking
            ? {
                title: "Ouvrir les demandes en ligne ?",
                description:
                  "Les visiteurs pourront envoyer une demande de commande depuis leur panier. Vous les accepterez ou les refuserez ici ; aucun paiement n’est demandé en ligne.",
                confirmLabel: "Ouvrir les demandes",
              }
            : null
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          toggle(true);
        }}
      />
    </div>
  );
}

const stateStyles: Record<OrderStateKey, string> = {
  to_validate: "bg-honey/15 text-honey-dark ring-honey/30",
  preparing: "bg-blue-50 text-blue-800 ring-blue-200",
  ready: "bg-teal-50 text-teal-800 ring-teal-200",
  shipped: "bg-teal-50 text-teal-800 ring-teal-200",
  done: "bg-green-50 text-green-800 ring-green-200",
  refused: "bg-red-50 text-red-800 ring-red-200",
  cancelled: "bg-sand text-muted ring-line",
};

export function OrderStatePill({ state }: { state: { key: OrderStateKey; label: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset ${stateStyles[state.key]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {state.label}
    </span>
  );
}

type OrderRef = { id: string; version: string; number: string };

/** Dialogue avec une note facultative (motif, précisions pour l'historique). */
function NoteDialog({
  open,
  title,
  description,
  confirmLabel,
  tone,
  placeholder,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  placeholder: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(480px,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(61_43_26/0.45)] backdrop:bg-espresso/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[dialog-in_160ms_ease-out]"
    >
      <form
        method="dialog"
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(note);
          setNote("");
        }}
      >
        <h2 className="font-display text-[19px] font-semibold">{title}</h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-body">{description}</p>
        <label className="mt-4 block text-[13px] font-medium text-ink">
          Note <span className="font-normal text-muted">(facultative, gardée dans l’historique)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={placeholder}
            className={`${adminInput} mt-1.5 py-2 font-normal`}
          />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={adminButton.secondary} autoFocus>
            Annuler
          </button>
          <button type="submit" className={tone === "danger" ? adminButton.dangerSolid : adminButton.primary}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

const paymentMethods = ["Virement", "Espèces", "Chèque", "Carte bancaire", "Autre"];

// Actions possibles selon l'état de la commande : décider, faire avancer,
// encaisser, annuler.
export function OrderActions({
  order,
  state,
  paymentStatus,
}: {
  order: OrderRef;
  state: OrderStateKey;
  paymentStatus: PaymentStatus;
}) {
  const { run, pending } = useAdminAction();
  const [dialog, setDialog] = useState<"accept" | "refuse" | "cancel" | null>(null);
  const [method, setMethod] = useState(paymentMethods[0]);
  const fields = { id: order.id, version: order.version, number: order.number };
  const finished = state === "done" || state === "refused" || state === "cancelled";

  return (
    <div className="space-y-3" data-pending={pending ? "" : undefined}>
      {state === "to_validate" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={pending} onClick={() => setDialog("accept")} className={`${adminButton.primary} flex-1`}>
            {pending ? <Spinner /> : <CheckIcon className="size-4" />}
            Accepter la demande
          </button>
          <button type="button" disabled={pending} onClick={() => setDialog("refuse")} className={`${adminButton.danger} flex-1`}>
            <CloseIcon className="size-4" />
            Refuser
          </button>
        </div>
      ) : null}

      {state === "preparing" ? (
        <button type="button" disabled={pending} onClick={() => run(advanceOrderAction, { ...fields, step: "ready" })} className={`${adminButton.primary} w-full`}>
          {pending ? <Spinner /> : <PackageIcon className="size-4" />}
          Marquer comme prête
        </button>
      ) : null}
      {state === "ready" || state === "shipped" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={pending} onClick={() => run(advanceOrderAction, { ...fields, step: "delivered" })} className={`${adminButton.primary} flex-1`}>
            {pending ? <Spinner /> : <CheckIcon className="size-4" />}
            Retirée ou livrée
          </button>
          <button type="button" disabled={pending} onClick={() => run(advanceOrderAction, { ...fields, step: "preparing" })} className={`${adminButton.secondary}`}>
            Remettre en préparation
          </button>
        </div>
      ) : null}

      {!finished && state !== "to_validate" && paymentStatus !== "paid" ? (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="payment-method">
            Moyen de paiement
          </label>
          <select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)} className={`${adminInput} h-10 min-w-0 flex-1`}>
            {paymentMethods.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={() => run(markOrderPaidAction, { ...fields, method })} className={adminButton.secondary}>
            <CoinsIcon className="size-4" />
            Marquer payée
          </button>
        </div>
      ) : null}

      {!finished && state !== "to_validate" ? (
        <button type="button" disabled={pending} onClick={() => setDialog("cancel")} className="text-[13px] text-muted transition hover:text-red-700">
          Annuler la commande…
        </button>
      ) : null}

      <NoteDialog
        open={dialog === "accept"}
        title={`Accepter ${order.number} ?`}
        description="Le stock des produits vendus en commande directe sera décompté. Pensez ensuite à prévenir le client."
        confirmLabel="Accepter"
        tone="primary"
        placeholder="Ex. retrait convenu le samedi 18 avril au matin"
        onCancel={() => setDialog(null)}
        onConfirm={(note) => {
          setDialog(null);
          run(acceptOrderAction, { ...fields, note });
        }}
      />
      <NoteDialog
        open={dialog === "refuse"}
        title={`Refuser ${order.number} ?`}
        description="La demande restera dans l’historique. Pensez à expliquer votre réponse au client."
        confirmLabel="Refuser la demande"
        tone="danger"
        placeholder="Motif : plus de disponibilité pour cette date…"
        onCancel={() => setDialog(null)}
        onConfirm={(note) => {
          setDialog(null);
          run(cancelOrderAction, { ...fields, note });
        }}
      />
      <NoteDialog
        open={dialog === "cancel"}
        title={`Annuler ${order.number} ?`}
        description="Le stock décompté à l’acceptation sera rendu. La commande restera dans l’historique."
        confirmLabel="Annuler la commande"
        tone="danger"
        placeholder="Motif de l’annulation"
        onCancel={() => setDialog(null)}
        onConfirm={(note) => {
          setDialog(null);
          run(cancelOrderAction, { ...fields, note });
        }}
      />
    </div>
  );
}

export function OrderNote({ order, initial }: { order: OrderRef; initial: string }) {
  const { run, pending } = useAdminAction();
  const [note, setNote] = useState(initial);
  const changed = note.trim() !== initial.trim();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(saveOrderNoteAction, { id: order.id, number: order.number, note });
      }}
      className="space-y-2.5"
    >
      <label htmlFor="internal-note" className="sr-only">
        Note interne
      </label>
      <textarea
        id="internal-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Visible uniquement dans l’administration : rappel, préférence du client…"
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
