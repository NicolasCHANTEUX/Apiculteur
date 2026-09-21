"use client";

export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-stone-950">
          Le catalogue est momentanément indisponible
        </h1>
        <p className="mt-2 text-stone-700">
          Une erreur est survenue pendant la lecture des produits.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-stone-900 px-4 py-2.5 font-medium text-white"
        >
          Réessayer
        </button>
      </section>
    </main>
  );
}
