"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangleIcon } from "@/components/icons";
import { adminButton } from "@/components/admin/admin-ui";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
};

// Dialogue de confirmation des actions sensibles (élément <dialog> natif :
// focus piégé, Échap pour annuler, fond inerte). Le bouton « Annuler »
// reçoit le focus pour qu'une validation au clavier ne détruise rien.
export function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (options && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!options && dialog.open) {
      dialog.close();
    }
  }, [options]);

  const danger = options?.tone === "danger";

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // Clic sur le fond (hors du contenu) : annule.
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(440px,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(61_43_26/0.45)] backdrop:bg-espresso/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[dialog-in_160ms_ease-out]"
    >
      {options ? (
        <div className="p-6">
          <div className="flex gap-4">
            {danger ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangleIcon className="size-5" />
              </span>
            ) : null}
            <div>
              <h2 id="confirm-title" className="font-display text-[19px] font-semibold">
                {options.title}
              </h2>
              {options.description ? (
                <div className="mt-2 text-[14px] leading-[1.55] text-body">{options.description}</div>
              ) : null}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" onClick={onCancel} className={adminButton.secondary}>
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={danger ? adminButton.dangerSolid : adminButton.primary}
            >
              {options.confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
