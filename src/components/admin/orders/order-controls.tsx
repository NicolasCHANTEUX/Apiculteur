"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { SettingSwitch } from "@/components/admin/setting-switch";
import { CheckIcon, CloseIcon, CoinsIcon, PackageIcon } from "@/components/icons";
import type { OrderStateKey, PaymentStatus } from "@/lib/orders/labels";

// Interrupteur « Demandes en ligne ». Ouvrir demande confirmation : les
// visiteurs pourront alors envoyer leurs demandes depuis le panier.
export function OrdersOpenSwitch({ open }: { open: boolean }) {
  return (
    <SettingSwitch
      checked={open}
      action={setOrdersOpenAction}
      title="Demandes en ligne"
      onLabel="Ouvertes aux visiteurs"
      offLabel="Fermées (contact par email)"
      ariaLabel="Recevoir les demandes de commande en ligne"
      confirmOn={{
        title: "Ouvrir les demandes en ligne ?",
        description:
          "Les visiteurs pourront envoyer une demande de commande depuis leur panier. Vous les accepterez ou les refuserez ici ; aucun paiement n’est demandé en ligne.",
        confirmLabel: "Ouvrir les demandes",
      }}
    />
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

/** Case « Prévenir le client par email », cochée par défaut. */
function NotifyCheckbox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 text-[13px] text-ink">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-line accent-honey"
      />
      Prévenir le client par email
    </label>
  );
}

/**
 * Dialogue de décision : message facultatif au client (repris dans l'email
 * et gardé dans l'historique), et choix de prévenir ou non le client.
 */
function NoteDialog({
  open,
  title,
  description,
  confirmLabel,
  tone,
  placeholder,
  canNotify,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  placeholder: string;
  /** Le client a une adresse email. */
  canNotify: boolean;
  onCancel: () => void;
  onConfirm: (note: string, notify: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const emailing = canNotify && notify;

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
          onConfirm(note, emailing);
          setNote("");
          setNotify(true);
        }}
      >
        <h2 className="font-display text-[19px] font-semibold">{title}</h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-body">{description}</p>
        {canNotify ? (
          <div className="mt-4">
            <NotifyCheckbox checked={notify} onChange={setNotify} />
          </div>
        ) : null}
        <label className="mt-4 block text-[13px] font-medium text-ink">
          {emailing ? (
            <>
              Message au client <span className="font-normal text-muted">(facultatif, ajouté à l’email)</span>
            </>
          ) : (
            <>
              Note <span className="font-normal text-muted">(facultative, gardée dans l’historique)</span>
            </>
          )}
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
  canNotify,
}: {
  order: OrderRef;
  state: OrderStateKey;
  paymentStatus: PaymentStatus;
  /** Le client a une adresse email. */
  canNotify: boolean;
}) {
  const { run, pending } = useAdminAction();
  const [dialog, setDialog] = useState<"accept" | "refuse" | "cancel" | null>(null);
  const [method, setMethod] = useState(paymentMethods[0]);
  // Pour « prête » et « payée », qui n'ouvrent pas de dialogue.
  const [notify, setNotify] = useState(true);
  const fields = { id: order.id, version: order.version, number: order.number, notify: String(canNotify && notify) };
  const decide = (note: string, emailing: boolean) => ({ ...fields, note, notify: String(emailing) });
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

      {canNotify && !finished && state !== "to_validate" ? (
        <div className="border-t border-line/60 pt-3">
          <NotifyCheckbox checked={notify} onChange={setNotify} />
          <p className="mt-1 pl-6.5 text-[12px] text-muted">Quand la commande est prête et quand le paiement est enregistré.</p>
        </div>
      ) : null}

      <NoteDialog
        open={dialog === "accept"}
        title={`Accepter ${order.number} ?`}
        description="Le stock des produits vendus en commande directe sera décompté."
        confirmLabel="Accepter"
        tone="primary"
        placeholder="Ex. retrait convenu le samedi 18 avril au matin"
        canNotify={canNotify}
        onCancel={() => setDialog(null)}
        onConfirm={(note, emailing) => {
          setDialog(null);
          run(acceptOrderAction, decide(note, emailing));
        }}
      />
      <NoteDialog
        open={dialog === "refuse"}
        title={`Refuser ${order.number} ?`}
        description="La demande restera dans l’historique. Un mot d’explication est toujours apprécié."
        confirmLabel="Refuser la demande"
        tone="danger"
        placeholder="Ex. plus de disponibilité pour cette date ; je peux vous en proposer en juin"
        canNotify={canNotify}
        onCancel={() => setDialog(null)}
        onConfirm={(note, emailing) => {
          setDialog(null);
          run(cancelOrderAction, decide(note, emailing));
        }}
      />
      <NoteDialog
        open={dialog === "cancel"}
        title={`Annuler ${order.number} ?`}
        description="Le stock décompté à l’acceptation sera rendu. La commande restera dans l’historique."
        confirmLabel="Annuler la commande"
        tone="danger"
        placeholder="Motif de l’annulation"
        canNotify={canNotify}
        onCancel={() => setDialog(null)}
        onConfirm={(note, emailing) => {
          setDialog(null);
          run(cancelOrderAction, decide(note, emailing));
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
