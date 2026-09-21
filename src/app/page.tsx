import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-20 sm:px-8">
      <section className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-800">
          Vente directe et réservations
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
          Des produits apicoles proposés avec soin et transparence.
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-9 text-stone-600">
          Cette première version pose le parcours essentiel : consulter les
          produits, comprendre leur disponibilité et préparer sa demande.
        </p>
        <Link
          href="/catalogue"
          className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-stone-900 px-6 py-3 font-medium text-white transition hover:bg-stone-700"
        >
          Découvrir le catalogue
        </Link>
      </section>
    </main>
  );
}
