"use client";

import { useOptimistic, useState } from "react";
import { Spinner, useAdminAction, type AdminAction } from "@/components/admin/action-button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/admin/confirm-dialog";

/**
 * Interrupteur d'un réglage du site (app_settings) : bascule immédiate à
 * l'écran, retour à la valeur enregistrée si le serveur refuse. `confirmOn` :
 * confirmation demandée avant d'activer.
 */
export function SettingSwitch({
  checked: saved,
  action,
  title,
  onLabel,
  offLabel,
  ariaLabel,
  confirmOn,
}: {
  checked: boolean;
  /** Reçoit le champ `value` (« true » ou « false »). */
  action: AdminAction;
  title: string;
  onLabel: string;
  offLabel: string;
  ariaLabel: string;
  confirmOn?: ConfirmOptions;
}) {
  const { run, pending } = useAdminAction();
  const [asking, setAsking] = useState(false);
  const [checked, setChecked] = useOptimistic(saved);
  const toggle = (next: boolean) => run(action, { value: String(next) }, { before: () => setChecked(next) });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 shadow-[0_1px_2px_rgb(61_43_26/0.05)]">
      <div className="text-[13px] leading-tight">
        <p className="font-medium text-ink">{title}</p>
        <p className={checked ? "text-green-700" : "text-muted"}>{checked ? onLabel : offLabel}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={pending}
        onClick={() => (checked ? toggle(false) : confirmOn ? setAsking(true) : toggle(true))}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${checked ? "bg-green-600" : "bg-line"}`}
      >
        <span
          className={`absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        >
          {pending ? <Spinner className="size-3 text-muted" /> : null}
        </span>
      </button>
      {confirmOn ? (
        <ConfirmDialog
          options={asking ? confirmOn : null}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            toggle(true);
          }}
        />
      ) : null}
    </div>
  );
}
