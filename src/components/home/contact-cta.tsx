import Link from "next/link";

export function ContactCta() {
  return (
    <section id="contact" className="bg-espresso text-cream">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Une question avant de commander ?
          </h2>
          <p className="mt-4 max-w-md leading-7 text-cream/70">
            Je réponds à chaque message personnellement, généralement sous
            24h. Que vous débutiez en apiculture ou que vous gériez déjà un
            rucher professionnel, je prends le temps de bien orienter chaque
            projet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="mailto:contact@ruchers-normandie.fr"
              className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-white transition hover:bg-accent-dark"
            >
              Écrire à Marc
            </a>
            <Link
              href="/faq"
              className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10"
            >
              Consulter la FAQ
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-espresso-light p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-white">
              M
            </span>
            <div>
              <p className="font-semibold text-white">Marc Dupont</p>
              <p className="text-xs text-cream/60">Apiculteur · Normandie</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-cream/80 italic">
            « N&apos;hésitez pas à me décrire votre projet — même si vous
            débutez. J&apos;aime prendre le temps de bien orienter chaque
            personne. »
          </p>
          <ul className="mt-5 space-y-2 text-sm text-cream/70">
            <li>contact@ruchers-normandie.fr</li>
            <li>06 12 34 56 78</li>
            <li>Réponse sous 24h généralement</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
