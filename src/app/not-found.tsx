import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-20 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
        Erreur 404
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">
        Cette page n&apos;existe pas
      </h1>
      <Link
        href="/catalogue"
        className="mt-6 inline-block font-medium text-stone-700 underline underline-offset-4"
      >
        Revenir au catalogue
      </Link>
    </main>
  );
}
