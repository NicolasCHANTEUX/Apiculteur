import Link from "next/link";

const navigationLinks = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Nos essaims" },
  { href: "/#a-propos", label: "À propos" },
  { href: "/#avis", label: "Avis clients" },
  { href: "/#contact", label: "Contact" },
];

const informationLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/livraison", label: "Livraison" },
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export function SiteFooter() {
  return (
    <footer className="bg-espresso text-cream/80">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-white"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
              A
            </span>
            Ruchers de Normandie
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-cream/60">
            Éleveur passionné d&apos;abeilles depuis 15 ans. Des essaims élevés
            avec soin, pour des apiculteurs accompagnés avec sérieux.
          </p>
        </div>

        <nav aria-label="Navigation du site">
          <p className="text-xs font-semibold tracking-widest text-cream/40 uppercase">
            Navigation
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {navigationLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Informations légales">
          <p className="text-xs font-semibold tracking-widest text-cream/40 uppercase">
            Informations
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {informationLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold tracking-widest text-cream/40 uppercase">
            Contact
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>contact@ruchers-normandie.fr</li>
            <li>06 12 34 56 78</li>
            <li>Normandie, France</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-cream/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} Ruchers de Normandie · Tous droits
            réservés
          </p>
          <p className="italic">Site conçu avec passion</p>
        </div>
      </div>
    </footer>
  );
}
