"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/(site)/connexion/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPaletteProvider, CommandTrigger, type CommandProduct } from "@/components/admin/command-palette";
import { ToastProvider } from "@/components/admin/toast";
import { CloseIcon, ExternalLinkIcon, LogOutIcon, MenuIcon, SearchIcon } from "@/components/icons";
import { site } from "@/lib/site";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-lg">
      <span className="flex size-9 items-center justify-center rounded-xl bg-honey font-display text-[16px] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.9)]">
        {site.shortName.charAt(0)}
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[16px] font-semibold text-white">{site.shortName}</span>
        <span className="block text-[11.5px] text-white/55">Espace apiculteur</span>
      </span>
    </Link>
  );
}

function SidebarFooter({ email }: { email: string | null }) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <Link
        href="/"
        target="_blank"
        rel="noopener"
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        <ExternalLinkIcon className="size-4 text-white/50" />
        Voir le site
      </Link>
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white uppercase"
          aria-hidden
        >
          {email?.charAt(0) ?? "A"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/70" title={email ?? undefined}>
          {email ?? "Administrateur"}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex size-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOutIcon className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Mise en page de l'administration : barre latérale fixe sur grand écran,
// en-tête compact et tiroir (dialogue modal, Échap pour fermer) sur mobile.
function SearchButton() {
  return (
    <CommandTrigger className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[13.5px] text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
      <SearchIcon className="size-4" />
      <span className="flex-1 text-left">Rechercher…</span>
      <kbd className="rounded border border-white/15 px-1.5 py-px text-[10.5px] font-medium text-white/50">Ctrl K</kbd>
    </CommandTrigger>
  );
}

export function AdminShell({
  email,
  products,
  badges,
  children,
}: {
  email: string | null;
  /** Compteurs de la navigation, par rubrique (demandes à valider…). */
  badges: Record<string, number>;
  /** Produits proposés par la recherche rapide. */
  products: CommandProduct[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Le tiroir se referme à chaque navigation.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (drawerOpen && !drawer.open) drawer.showModal();
    if (!drawerOpen && drawer.open) drawer.close();
  }, [drawerOpen]);

  return (
    <ToastProvider>
      <CommandPaletteProvider products={products}>
      <a
        href="#contenu"
        className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-[14px] font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <div className="flex min-h-full flex-1 bg-cream">
        <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col bg-espresso px-3 py-5 lg:flex">
          <div className="px-2">
            <Brand />
          </div>
          <div className="mt-6">
            <SearchButton />
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">
            <AdminNav badges={badges} />
          </div>
          <SidebarFooter email={email} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 bg-espresso px-3 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex size-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Ouvrir le menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
            >
              <MenuIcon className="size-5" />
            </button>
            <Brand />
            <CommandTrigger className="flex size-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white">
              <SearchIcon className="size-[18px]" />
              <span className="sr-only">Recherche rapide</span>
            </CommandTrigger>
          </header>

          <div
            id="contenu"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-16 outline-none sm:px-6 lg:px-10 lg:pt-9"
          >
            {children}
          </div>
        </div>
      </div>

      <dialog
        ref={drawerRef}
        aria-label="Menu de l’administration"
        onCancel={(event) => {
          event.preventDefault();
          setDrawerOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDrawerOpen(false);
        }}
        className="m-0 h-dvh max-h-none w-[min(300px,85vw)] max-w-none bg-transparent p-0 backdrop:bg-espresso/50 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[drawer-in_180ms_ease-out] lg:hidden"
      >
        <div className="flex h-full flex-col bg-espresso px-3 py-4">
          <div className="flex items-center justify-between px-2">
            <Brand />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex size-10 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer le menu"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">
            <AdminNav badges={badges} />
          </div>
          <SidebarFooter email={email} />
        </div>
      </dialog>
      </CommandPaletteProvider>
    </ToastProvider>
  );
}
