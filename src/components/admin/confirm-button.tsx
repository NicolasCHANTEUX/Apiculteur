"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Bouton d'envoi d'un formulaire serveur, avec confirmation optionnelle et
// état « en cours » (désactivé pendant l'action).
export function SubmitButton({
  children,
  className,
  confirm,
  pendingLabel = "…",
  title,
}: {
  children: ReactNode;
  className: string;
  confirm?: string;
  pendingLabel?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
