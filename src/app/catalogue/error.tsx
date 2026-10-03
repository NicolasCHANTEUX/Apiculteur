"use client";

import { container } from "@/components/ui";

export default function CatalogError({ retry }: { retry: () => void }) {
  return (
    <main className={`${container} flex-1 py-16`}>
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="font-display text-xl font-semibold text-ink">
          Le catalogue est momentanément indisponible
        </h1>
        <p className="mt-2 text-[14px] text-body">
          Une erreur est survenue pendant la lecture des produits.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-honey px-5 text-[14px] font-semibold text-white transition hover:bg-honey-dark"
        >
          Réessayer
        </button>
      </section>
    </main>
  );
}
