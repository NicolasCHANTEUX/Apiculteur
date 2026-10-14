"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  CornerDownLeftIcon,
  DashboardIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  MailIcon,
  TagIcon,
} from "@/components/icons";
import { productStatusLabels } from "@/lib/catalog/labels";

export type CommandProduct = { id: string; name: string; status: string };

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  external?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  keywords?: string;
};

const baseCommands: Command[] = [
  { id: "dashboard", group: "Aller à", label: "Tableau de bord", href: "/admin", icon: DashboardIcon, keywords: "accueil" },
  { id: "orders", group: "Aller à", label: "Commandes", href: "/admin/commandes", icon: ShoppingBagIcon, keywords: "demandes clients" },
  { id: "products", group: "Aller à", label: "Produits", href: "/admin/produits", icon: PackageIcon, keywords: "catalogue liste" },
  { id: "new", group: "Aller à", label: "Nouveau produit", hint: "Créer une fiche", href: "/admin/produits/nouveau", icon: PlusIcon, keywords: "ajouter creer" },
  { id: "categories", group: "Aller à", label: "Catégories", href: "/admin/categories", icon: TagIcon },
  { id: "emails", group: "Aller à", label: "Emails", href: "/admin/emails", icon: MailIcon, keywords: "messages clients journal envoi" },
  { id: "site", group: "Aller à", label: "Voir la boutique", hint: "Nouvel onglet", href: "/", external: true, icon: ExternalLinkIcon, keywords: "site public" },
  { id: "to-validate", group: "Filtres", label: "Commandes à valider", href: "/admin/commandes?statut=a-valider", icon: ShoppingBagIcon, keywords: "demandes en attente" },
  { id: "out", group: "Filtres", label: "Produits en rupture", href: "/admin/produits?stock=rupture", icon: AlertTriangleIcon, keywords: "stock vide epuise" },
  { id: "low", group: "Filtres", label: "Stock faible", href: "/admin/produits?stock=faible", icon: AlertTriangleIcon, keywords: "alerte seuil" },
  { id: "drafts", group: "Filtres", label: "Brouillons", href: "/admin/produits?statut=draft", icon: PencilIcon },
  { id: "hidden", group: "Filtres", label: "Produits masqués", href: "/admin/produits?statut=hidden", icon: EyeOffIcon },
  { id: "archived", group: "Filtres", label: "Produits archivés", href: "/admin/produits?statut=archived", icon: ArchiveIcon },
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const OpenContext = createContext<() => void>(() => {});

/** Ouvre la recherche rapide (Ctrl K). */
export function useCommandPalette() {
  return useContext(OpenContext);
}

export function CommandPaletteProvider({ products, children }: { products: CommandProduct[]; children: ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialogRef.current?.open) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    const productCommands: Command[] = products.map((product) => ({
      id: `product-${product.id}`,
      group: "Produits",
      label: product.name,
      hint: productStatusLabels[product.status as keyof typeof productStatusLabels] ?? product.status,
      href: `/admin/produits/${product.id}`,
      icon: PackageIcon,
    }));
    if (!term) return baseCommands;
    return [...baseCommands, ...productCommands]
      .filter((command) => normalize(`${command.label} ${command.keywords ?? ""}`).includes(term))
      .slice(0, 12);
  }, [products, query]);

  function run(command: Command | undefined) {
    if (!command) return;
    setOpen(false);
    if (command.external) window.open(command.href, "_blank", "noopener");
    else router.push(command.href);
  }

  let lastGroup = "";

  return (
    <OpenContext.Provider value={show}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label="Recherche rapide"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="mx-auto mt-[12vh] w-[min(620px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-line bg-white p-0 text-ink shadow-[0_32px_80px_-20px_rgb(61_43_26/0.55)] backdrop:bg-espresso/45 backdrop:backdrop-blur-[3px] open:motion-safe:animate-[dialog-in_160ms_ease-out]"
      >
        <div className="flex items-center gap-3 border-b border-line/70 px-4">
          <SearchIcon className="size-5 shrink-0 text-honey" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(results.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                run(results[active]);
              }
            }}
            placeholder="Rechercher un produit, une page, un filtre…"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/80"
          />
          <kbd className="hidden rounded-md border border-line bg-cream px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block">Échap</kbd>
        </div>

        <ul id={listId} role="listbox" aria-label="Résultats" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13.5px] text-muted">Aucun résultat pour « {query} ».</li>
          ) : (
            results.map((command, index) => {
              const Icon = command.icon;
              const heading = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              const selected = index === active;
              return (
                <li key={command.id} role="presentation">
                  {heading ? (
                    <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{heading}</p>
                  ) : null}
                  <div
                    id={`${listId}-${command.id}`}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => setActive(index)}
                    onClick={() => run(command)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] transition-colors ${
                      selected ? "bg-honey/12 text-ink" : "text-body"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        selected ? "bg-honey text-white" : "bg-sand text-brown"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    {command.hint ? <span className="shrink-0 text-[12px] text-muted">{command.hint}</span> : null}
                    {selected ? <CornerDownLeftIcon className="size-4 shrink-0 text-honey-dark" /> : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-4 border-t border-line/70 bg-cream/60 px-4 py-2.5 text-[11.5px] text-muted">
          <span><kbd className="font-sans font-semibold text-body">↑ ↓</kbd> parcourir</span>
          <span><kbd className="font-sans font-semibold text-body">Entrée</kbd> ouvrir</span>
          <span className="ml-auto"><kbd className="font-sans font-semibold text-body">Ctrl K</kbd> ouvrir ou fermer</span>
        </div>
      </dialog>
    </OpenContext.Provider>
  );
}

/** Bouton qui ouvre la recherche rapide ; l'apparence est fournie par l'appelant. */
export function CommandTrigger({ className, children }: { className: string; children: ReactNode }) {
  const open = useCommandPalette();
  return (
    <button type="button" onClick={open} className={className} aria-keyshortcuts="Control+K Meta+K">
      {children}
    </button>
  );
}
