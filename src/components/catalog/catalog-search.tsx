"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import { catalogHref, catalogSorts, type CatalogCriteria, type CatalogSort } from "@/lib/catalog/browse";

// Recherche et tri du catalogue (CAHIER §5.1). Formulaire GET ordinaire :
// sans JavaScript, « Rechercher » recharge la page filtrée par le serveur.
// Avec JavaScript, la recherche s'applique pendant la frappe et le tri dès
// qu'il change, par une navigation côté client (adresse propre, page 1).
export function CatalogSearch({ criteria }: { criteria: CatalogCriteria }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(criteria.q);
  // Recherche reçue du serveur et dernière recherche envoyée : une recherche
  // changée ailleurs (critère retiré, « Tout effacer ») remplace la saisie.
  const [seen, setSeen] = useState(criteria.q);
  const [sent, setSent] = useState(criteria.q);
  const timer = useRef<number | undefined>(undefined);
  // Critères à jour au moment où la recherche différée part.
  const latest = useRef(criteria);
  useEffect(() => {
    latest.current = criteria;
  });

  if (criteria.q !== seen) {
    setSeen(criteria.q);
    if (criteria.q !== sent) setQ(criteria.q);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function go(patch: Partial<CatalogCriteria>) {
    window.clearTimeout(timer.current);
    if (patch.q !== undefined) setSent(patch.q);
    startTransition(() => router.replace(catalogHref(latest.current, patch), { scroll: false }));
  }

  return (
    <form
      action="/catalogue"
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: q.trim() });
      }}
      className="flex flex-wrap items-center gap-3"
    >
      {criteria.categorie ? <input type="hidden" name="categorie" value={criteria.categorie} /> : null}
      {criteria.vue ? <input type="hidden" name="vue" value={criteria.vue} /> : null}
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">Rechercher un essaim</span>
        <SearchIcon className={`pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 ${pending ? "animate-pulse text-honey" : "text-muted"}`} />
        <input
          type="search"
          name="q"
          value={q}
          maxLength={80}
          onChange={(event) => {
            const value = event.target.value;
            setQ(value);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => go({ q: value.trim() }), 350);
          }}
          placeholder="Rechercher une race, un produit…"
          className="h-11 w-full rounded-full border border-line/80 bg-cream/60 pr-4 pl-11 text-[16px] text-ink outline-none transition placeholder:text-muted focus:border-honey focus:bg-white focus:ring-3 focus:ring-honey/15 sm:text-[14px]"
        />
      </label>
      <div className="flex flex-1 items-center gap-3 sm:flex-none">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-muted sm:flex-none">
        <span className="hidden sm:inline">Trier</span>
        <span className="sr-only sm:hidden">Trier</span>
        <select
          name="tri"
          defaultValue={criteria.tri}
          key={criteria.tri}
          onChange={(event) => go({ tri: event.target.value as CatalogSort })}
          className="h-11 w-full rounded-full border border-line/80 bg-white pr-7 pl-3.5 text-[16px] text-ink outline-none focus:border-honey sm:w-auto sm:pr-9 sm:pl-4 sm:text-[14px]"
        >
          {Object.entries(catalogSorts).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-honey px-4 text-[14px] sm:px-5 font-semibold text-white transition hover:bg-honey-dark"
      >
        Rechercher
      </button>
      </div>
    </form>
  );
}
