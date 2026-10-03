"use client";

import Link from "next/link";
import { container } from "@/components/ui";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className={`${container} flex-1 py-20 text-center`}>
      <p className="text-[13px] font-semibold tracking-[0.08em] text-honey uppercase">
        Erreur
      </p>
      <h1 className="mt-3 font-display text-[30px] leading-[1.24] font-medium text-ink sm:text-[34px]">
        Cette page n’a pas pu s’afficher
      </h1>
      <p className="mx-auto mt-3 max-w-[480px] text-[14px] leading-[1.6] text-muted">
        Un problème momentané est survenu. Vous pouvez réessayer ou revenir à
        l’accueil.
        {error.digest ? (
          <span className="mt-2 block text-[12px]">
            Référence de l’erreur : {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center rounded-lg bg-honey px-[22px] text-[15px] font-semibold text-white transition hover:bg-honey-dark"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-lg border border-line px-[22px] text-[15px] font-medium text-ink transition hover:bg-sand"
        >
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
