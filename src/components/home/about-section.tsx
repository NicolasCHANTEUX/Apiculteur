const stats = [
  { value: "200", label: "colonies actives" },
  { value: "15 ans", label: "d'expérience" },
  { value: "8", label: "races travaillées" },
  { value: "France", label: "entière" },
];

// Placeholder en attendant une vraie photo de l'apiculteur au travail.
export function AboutSection() {
  return (
    <section id="a-propos" className="bg-cream">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-2 md:items-center">
        <div className="relative">
          <div className="aspect-[4/5] w-full rounded-3xl bg-gradient-to-br from-[#8a6a35] via-[#5c4522] to-[#2e2314]" />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur sm:right-auto sm:w-72">
            <p className="text-sm leading-6 text-ink italic">
              « Je préfère accompagner chaque client sérieusement plutôt que
              vendre à tout prix. »
            </p>
            <p className="mt-2 text-xs font-semibold text-ink-muted">Marc</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
            À propos
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Avant les ruches, il y a surtout une passion.
          </h2>
          <p className="mt-5 leading-7 text-ink-muted">
            Je suis Marc Dupont, apiculteur en Normandie depuis 2009. Ce qui a
            commencé avec 3 ruches dans mon jardin est devenu une exploitation
            de 200 colonies, entièrement gérée avec méthode et respect.
          </p>
          <p className="mt-4 leading-7 text-ink-muted">
            Quand vous commandez chez moi, je réponds personnellement à vos
            questions — avant, pendant et après la livraison. Pas de
            formulaire sans robot, pas de réponse automatique.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-semibold text-accent-dark">
                  {stat.value}
                </dd>
                <p className="text-xs text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
