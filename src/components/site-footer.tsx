import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Logo, container } from "@/components/ui";
import { infoNav, mainNav, site } from "@/lib/site";

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold tracking-[0.08em] text-white uppercase">
      {children}
    </p>
  );
}

// La FAQ figure deja dans la colonne "Informations".
const footerNav = mainNav.filter((link) => link.href !== "/faq");

export function SiteFooter() {
  const years = new Date().getFullYear() - site.owner.since;

  return (
    <footer className="bg-espresso text-wheat">
      <div
        className={`${container} grid gap-10 pt-14 pb-12 sm:grid-cols-2 lg:grid-cols-4`}
      >
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-[230px] text-[13px] leading-[1.65]">
            Éleveur passionné d&apos;abeilles depuis {years} ans. Des essaims
            élevés avec soin, pour des apiculteurs accompagnés avec sérieux.
          </p>
        </div>

        <nav aria-label="Navigation du site">
          <FooterHeading>Navigation</FooterHeading>
          <ul className="mt-5 space-y-2.5 text-[13px] leading-[18px]">
            {footerNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Informations">
          <FooterHeading>Informations</FooterHeading>
          <ul className="mt-5 space-y-2.5 text-[13px] leading-[18px]">
            {infoNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <FooterHeading>Contact</FooterHeading>
          <ul className="mt-5 space-y-3 text-[13px] leading-[18px]">
            <li>
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-2.5 transition hover:text-white"
              >
                <MailIcon className="size-3.5 shrink-0" />
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.phoneHref}
                className="flex items-center gap-2.5 transition hover:text-white"
              >
                <PhoneIcon className="size-3.5 shrink-0" />
                {site.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPinIcon className="size-3.5 shrink-0" />
              {site.region}
            </li>
          </ul>
          <div className="mt-5 flex gap-3">
            <a
              href={site.social.instagram}
              aria-label="Instagram"
              className="flex size-[34px] items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white transition hover:bg-white/20"
            >
              ig
            </a>
            <a
              href={site.social.facebook}
              aria-label="Facebook"
              className="flex size-[34px] items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white transition hover:bg-white/20"
            >
              f
            </a>
          </div>
        </div>
      </div>

      <div className={container}>
        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-[11px] text-bark sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name} — Tous droits réservés
          </p>
          <p className="flex gap-4">
            <span>Site réalisé avec passion</span>
            <Link href="/connexion" className="transition hover:text-wheat">
              Espace apiculteur
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
