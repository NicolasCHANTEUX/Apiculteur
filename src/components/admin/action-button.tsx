"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmOptions } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toast";
import type { ActionResult } from "@/lib/admin/action-result";

export type AdminAction = (formData: FormData) => Promise<ActionResult | void>;

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Lance une action serveur dans une transition et affiche son résultat dans
 * une notification. Les redirections décidées par le serveur (et les erreurs
 * inattendues) ne sont pas interceptées : Next les gère.
 */
export function useAdminAction() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (action: AdminAction, fields: Record<string, string>, options: { quiet?: boolean } = {}) => {
      startTransition(async () => {
        const formData = new FormData();
        for (const [name, value] of Object.entries(fields)) formData.append(name, value);
        const result = await action(formData);
        if (!result || result.status === "idle") return;
        if (result.status === "error") toast.show("error", result.message);
        else if (!options.quiet) toast.show("success", result.message);
      });
    },
    [toast],
  );

  return { run, pending };
}

/** Bouton qui déclenche une action serveur, avec confirmation facultative. */
export function ActionButton({
  action,
  fields,
  confirm,
  children,
  className,
  title,
  label,
}: {
  action: AdminAction;
  fields: Record<string, string>;
  confirm?: ConfirmOptions;
  children: ReactNode;
  className: string;
  title?: string;
  /** Nom accessible, pour un bouton qui ne contient qu'une icône. */
  label?: string;
}) {
  const { run, pending } = useAdminAction();
  const [asking, setAsking] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        title={title ?? label}
        aria-label={label}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => (confirm ? setAsking(true) : run(action, fields))}
      >
        {pending ? <Spinner className="size-4" /> : null}
        {pending && label ? null : children}
      </button>
      {confirm ? (
        <ConfirmDialog
          options={asking ? confirm : null}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            run(action, fields);
          }}
        />
      ) : null}
    </>
  );
}
