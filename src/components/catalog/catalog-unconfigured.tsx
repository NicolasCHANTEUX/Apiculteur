import Link from "next/link";

export function CatalogUnconfigured() {
  return (
    <section className="rounded-xl border border-dashed border-honey/50 bg-white/60 p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        Le catalogue n’est pas encore disponible
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-[1.6] text-body">
        Revenez bientôt pour découvrir les produits disponibles, ou contactez
        l’apiculteur pour connaître les disponibilités du moment.
      </p>
      <Link href="/contact" className="mt-4 inline-block text-sm font-medium text-honey-dark underline">Nous contacter</Link>
    </section>
  );
}
