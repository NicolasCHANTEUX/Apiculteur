import Link from "next/link";

// Placeholder en attendant de vraies photos de l'exploitation (section 1 du
// cahier des charges). Degrade chaud en lieu et place de la photo du
// beekeeper en action visible dans la maquette Figma.
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#3c2f1a] via-[#6b4e23] to-[#a9782f]">
      <div className="absolute inset-0 bg-black/25" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          Saison 2026 ouverte
        </span>

        <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Des essaims élevés avec soin, pour des apiculteurs accompagnés avec
          sérieux.
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">
          Apiculteur depuis 15 ans en Normandie, je produis et livre des
          essaims de qualité — avec un suivi personnalisé à chaque étape.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalogue"
            className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-white shadow-sm transition hover:bg-accent-dark"
          >
            Découvrir les essaims →
          </Link>
          <Link
            href="/#contact"
            className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 font-semibold text-white transition hover:bg-white/10"
          >
            Me contacter
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/15 font-display text-sm font-semibold text-white">
            M
          </span>
          <p className="text-sm text-white/80">
            <span className="font-semibold text-white">Marc Dupont</span> ·
            Apiculteur en Normandie depuis 2009 · Je réponds personnellement
            à chaque demande.
          </p>
        </div>
      </div>

      <ul className="relative grid grid-cols-1 gap-3 bg-espresso/90 px-5 py-4 text-sm text-cream/90 sm:grid-cols-3 sm:px-8">
        {[
          "Élevage avec soin",
          "Conseils personnalisés",
          "Livraison étudiée",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="size-4 shrink-0 text-accent"
              aria-hidden
            >
              <path
                d="M4 10.5l3.5 3.5L16 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
