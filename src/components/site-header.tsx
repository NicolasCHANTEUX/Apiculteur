import Link from "next/link";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Nos essaims" },
  { href: "/#a-propos", label: "À propos" },
  { href: "/#avis", label: "Avis clients" },
  { href: "/faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            A
          </span>
          Ruchers
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-black/5 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/catalogue"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark"
        >
          Voir les disponibilités
        </Link>
      </div>
    </header>
  );
}
