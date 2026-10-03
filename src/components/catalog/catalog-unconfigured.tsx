export function CatalogUnconfigured() {
  return (
    <section className="rounded-xl border border-dashed border-honey/50 bg-white/60 p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        Le catalogue attend sa connexion Supabase
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-[1.6] text-body">
        Copiez <code>.env.example</code> vers <code>.env.local</code>, renseignez
        les deux variables publiques, puis appliquez les migrations et le seed.
        Cette page affichera alors les vrais produits publiés.
      </p>
    </section>
  );
}
