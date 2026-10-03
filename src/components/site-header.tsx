"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CartIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { Logo, container } from "@/components/ui";
import { mainNav } from "@/lib/site";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/catalogue") {
    return pathname.startsWith("/catalogue") || pathname.startsWith("/produits");
  }
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Le menu mobile se referme a chaque navigation.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-cream/85 backdrop-blur-md">
      <div
        className={`${container} flex h-[var(--header-height)] items-center justify-between gap-6`}
      >
        <Logo />

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 text-[13.5px] transition ${
                      active
                        ? "bg-honey/12 text-honey"
                        : "text-body hover:bg-honey/8 hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/panier"
            aria-label="Panier"
            className="flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-honey/10"
          >
            <CartIcon className="size-5" />
          </Link>
          <Link
            href="/catalogue"
            className="hidden min-h-[37px] items-center rounded-lg bg-honey px-4 text-[13px] font-medium text-white shadow-[0_4px_12px_-4px_rgb(217_154_43/0.7)] transition hover:bg-honey-dark sm:inline-flex"
          >
            Voir les disponibilités
          </Link>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-honey/10 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <CloseIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="menu-mobile"
          aria-label="Navigation mobile"
          className="border-t border-line/60 bg-cream lg:hidden"
        >
          <ul className={`${container} flex flex-col gap-1 py-4`}>
            {mainNav.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-4 py-3 text-[15px] ${
                      active ? "bg-honey/12 text-honey" : "text-body"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2 sm:hidden">
              <Link
                href="/catalogue"
                className="flex min-h-12 items-center justify-center rounded-lg bg-honey text-[15px] font-medium text-white"
              >
                Voir les disponibilités
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
