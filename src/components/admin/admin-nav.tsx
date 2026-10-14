"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "@/components/admin/link-pending";
import type { ComponentType, SVGProps } from "react";
import {
  DashboardIcon,
  InboxIcon,
  MailIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const ready: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: DashboardIcon },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBagIcon },
  { href: "/admin/demandes", label: "Demandes", icon: InboxIcon },
  { href: "/admin/produits", label: "Produits", icon: PackageIcon },
  { href: "/admin/categories", label: "Catégories", icon: TagIcon },
  { href: "/admin/emails", label: "Emails", icon: MailIcon },
];

// Les rubriques arrivent lot par lot (ROADMAP.md) : elles sont annoncées
// sans lien pour montrer la structure à venir.
const upcoming: (NavItem & { lot: string })[] = [
  { href: "/admin/avis", label: "Avis", icon: StarIcon, lot: "Lot 8" },
  { href: "/admin/clients", label: "Clients", icon: UsersIcon, lot: "Lot 9" },
  { href: "/admin/parametres", label: "Paramètres", icon: SettingsIcon, lot: "Lot 14" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** `badges` : compteurs affichés à côté d'une rubrique (ex. demandes à valider). */
export function AdminNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="space-y-6">
      <ul className="space-y-0.5">
        {ready.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] transition ${
                  active
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active ? (
                  <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-honey" aria-hidden />
                ) : null}
                <Icon className={`size-[18px] shrink-0 ${active ? "text-honey" : "text-white/50 group-hover:text-white/80"}`} />
                <span className="flex-1">{item.label}</span>
                <LinkPending className="text-honey" />
                {badges[item.href] ? (
                  <span className="rounded-full bg-honey px-1.5 py-px text-[11px] font-semibold text-white tabular-nums" aria-label={`${badges[item.href]} à traiter`}>
                    {badges[item.href]}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div>
        <p className="px-3 text-[11px] font-medium tracking-[0.08em] text-white/40 uppercase">Prochainement</p>
        <ul className="mt-2 space-y-0.5">
          {upcoming.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <span
                  aria-disabled="true"
                  title={`Bientôt disponible (${item.lot})`}
                  className="flex min-h-9 cursor-default items-center gap-3 rounded-lg px-3 text-[13.5px] text-white/35"
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                  <span className="sr-only"> — bientôt disponible</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
