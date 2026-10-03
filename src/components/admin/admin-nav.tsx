"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Les rubriques arrivent lot par lot (ROADMAP.md) : `ready: false` les
// affiche comme « bientôt » sans lien, pour montrer la structure à venir.
const items = [
  { href: "/admin", label: "Tableau de bord", ready: true },
  { href: "/admin/produits", label: "Produits", ready: true, also: ["/admin/categories"] },
  { href: "/admin/commandes", label: "Commandes", ready: false },
  { href: "/admin/demandes", label: "Demandes", ready: false },
  { href: "/admin/avis", label: "Avis", ready: false },
  { href: "/admin/clients", label: "Clients", ready: false },
  { href: "/admin/parametres", label: "Paramètres", ready: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : [item.href, ...("also" in item ? item.also : [])].some((prefix) =>
                  pathname.startsWith(prefix),
                );
          return (
            <li key={item.href}>
              {item.ready ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center rounded-full px-4 text-[13.5px] transition ${
                    active
                      ? "bg-honey text-white"
                      : "text-body hover:bg-honey/10 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title="Bientôt disponible"
                  className="flex min-h-10 cursor-not-allowed items-center gap-1.5 rounded-full px-4 text-[13.5px] text-muted/70"
                >
                  {item.label}
                  <span className="rounded-full bg-sand px-1.5 py-0.5 text-[10px] text-muted">
                    bientôt
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
