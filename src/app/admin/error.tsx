"use client";

import Link from "next/link";
import { adminButton } from "@/components/admin/admin-ui";
import { AlertTriangleIcon } from "@/components/icons";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="mx-auto max-w-[560px] rounded-2xl border border-red-200 bg-white p-6 text-center shadow-[0_8px_24px_-18px_rgb(61_43_26/0.35)] sm:p-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangleIcon className="size-5" />
      </span>
      <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">
        Cette page n’a pas pu s’afficher
      </h1>
      <p className="mt-2 text-[14px] leading-[1.55] text-body">
        Les données sont peut-être momentanément inaccessibles. Vos dernières modifications enregistrées ne sont pas perdues.
      </p>
      {error.digest ? <p className="mt-2 text-[12px] text-muted">Référence : {error.digest}</p> : null}
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={() => retry()} className={adminButton.primary}>
          Réessayer
        </button>
        <Link href="/admin" className={adminButton.secondary}>
          Retour au tableau de bord
        </Link>
      </div>
    </section>
  );
}
