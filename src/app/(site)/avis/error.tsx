"use client";

import Link from "next/link";
import { container } from "@/components/ui";

export default function ReviewsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className={`${container} flex-1 py-20`}>
    <section className="mx-auto max-w-xl rounded-xl border border-line bg-white p-8 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Les avis sont momentanément indisponibles</h1>
      <p className="mt-3 text-sm text-body">Nous n’avons pas pu les charger. Vous pouvez réessayer ou revenir au catalogue.</p>
      {error.digest ? <p className="mt-2 text-xs text-muted">Référence : {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="min-h-11 rounded-lg bg-honey px-5 font-medium text-white hover:bg-honey-dark">Réessayer</button>
        <Link href="/catalogue" className="inline-flex min-h-11 items-center rounded-lg border border-line px-5 text-ink hover:bg-sand">Voir le catalogue</Link>
      </div>
    </section>
  </main>;
}
