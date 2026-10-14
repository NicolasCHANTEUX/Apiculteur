"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/admin/action-button";

/**
 * Petite roue affichée dans un lien pendant que sa page se charge. À placer
 * dans un <Link> ; taille fixe pour ne rien décaler.
 */
export function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`inline-flex size-4 shrink-0 items-center justify-center ${className}`}>
      {pending ? <Spinner className="size-3.5" /> : null}
    </span>
  );
}
