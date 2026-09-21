export function CatalogUnconfigured() {
  return (
    <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-stone-950">
        Le catalogue attend sa connexion Supabase
      </h2>
      <p className="mt-2 max-w-2xl leading-7 text-stone-700">
        Copiez <code>.env.example</code> vers <code>.env.local</code>, renseignez
        les deux variables publiques, puis appliquez les migrations et le seed.
        Cette page affichera alors les vrais produits publiés.
      </p>
    </section>
  );
}
