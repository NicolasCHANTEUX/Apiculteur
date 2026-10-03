"use client";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="font-display text-xl font-semibold text-ink">
        Cette page de l’administration n’a pas pu s’afficher
      </h1>
      <p className="mt-2 text-[14px] text-body">
        Les données sont peut-être momentanément inaccessibles.
        {error.digest ? ` Référence : ${error.digest}.` : ""}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-honey px-5 text-[14px] font-semibold text-white transition hover:bg-honey-dark"
      >
        Réessayer
      </button>
    </section>
  );
}
