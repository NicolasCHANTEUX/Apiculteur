const steps = [
  {
    title: "Vous choisissez votre essaim",
    description:
      "Parcourez le catalogue et sélectionnez la race et la quantité adaptées à votre projet.",
    icon: (
      <path
        d="M6 8h8l1 9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l1-9Z M8 8V6a2 2 0 1 1 4 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Je vérifie votre besoin",
    description:
      "Pour les commandes importantes ou éloignées, j'étudie personnellement les conditions de livraison avant de confirmer. Rien n'est laissé au hasard.",
    icon: (
      <path
        d="M4 6h12v8H8l-4 3V6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Je prépare avec soin",
    description:
      "Chaque essaim est contrôlé, conditionné dans les meilleures conditions pour le transport. Vous êtes informé du départ.",
    icon: (
      <path
        d="M4 7l6-3 6 3-6 3-6-3Zm0 0v6l6 3m0-9v9m6-9v6l-6 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Livraison ou retrait",
    description:
      "La livraison est organisée en concertation avec vous selon votre situation. Retrait sur exploitation également possible.",
    icon: (
      <path
        d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function ProcessSteps() {
  return (
    <section className="bg-tan">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8">
        <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
          Le parcours
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Comment ça se passe ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink-muted">
          Du premier contact à la livraison, chaque étape est suivie
          personnellement.
        </p>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-cream shadow-sm">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="size-7 text-accent-dark"
                  aria-hidden
                >
                  {step.icon}
                </svg>
                <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
