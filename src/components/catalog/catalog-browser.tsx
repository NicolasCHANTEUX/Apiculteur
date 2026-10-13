"use client";

import { useState } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { CloseIcon, SearchIcon } from "@/components/icons";
import type { PublicProduct } from "@/data/catalog";
import {
  catalogSorts,
  criteriaQuery,
  filterAndSort,
  matchesView,
  quickViews,
  type CatalogCriteria,
  type CatalogSort,
  type QuickView,
} from "@/lib/catalog/browse";
import type { RatingSummary } from "@/lib/domain/ratings";

function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition ${
        active
          ? "border-honey bg-honey text-white shadow-[0_4px_12px_-4px_rgb(217_154_43/0.7)]"
          : "border-line bg-white text-body hover:border-honey/50 hover:text-ink"
      }`}
    >
      {children}
      {count !== undefined ? (
        <span className={`text-[11.5px] tabular-nums ${active ? "text-white/80" : "text-muted"}`}>{count}</span>
      ) : null}
    </button>
  );
}

// Recherche, catégories, filtres rapides et tri, appliqués dans le
// navigateur ; l'URL reprend les critères pour que la sélection soit
// partageable (et retrouvée au retour arrière).
export function CatalogBrowser({
  products,
  ratings,
  initial,
}: {
  products: PublicProduct[];
  ratings: Record<string, RatingSummary>;
  initial: CatalogCriteria;
}) {
  const [criteria, setCriteria] = useState(initial);
  const filtered = filterAndSort(products, criteria);

  function update(patch: Partial<CatalogCriteria>) {
    const next = { ...criteria, ...patch };
    setCriteria(next);
    window.history.replaceState(null, "", `/catalogue${criteriaQuery(next)}`);
  }

  const categories = [
    ...new Map(
      products
        .filter((product) => product.category)
        .map((product) => [product.category!.slug, product.category!.name]),
    ),
  ];
  const views = (Object.keys(quickViews) as QuickView[])
    .map((view) => ({ view, count: products.filter((product) => matchesView(product, view)).length }))
    .filter(({ count }) => count > 0 && count < products.length);
  const active = Boolean(criteria.q || criteria.categorie || criteria.vue);

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_3px_rgb(61_43_26/0.05)] sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Rechercher un essaim</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={criteria.q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Rechercher une race, un produit…"
              className="h-11 w-full rounded-full border border-line/80 bg-cream/60 pr-4 pl-11 text-[16px] text-ink outline-none transition placeholder:text-muted focus:border-honey focus:bg-white focus:ring-3 focus:ring-honey/15 sm:text-[14px]"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <span className="hidden sm:inline">Trier</span>
            <span className="sr-only sm:hidden">Trier</span>
            <select
              value={criteria.tri}
              onChange={(event) => update({ tri: event.target.value as CatalogSort })}
              className="h-11 rounded-full border border-line/80 bg-white pr-9 pl-4 text-[16px] text-ink outline-none focus:border-honey sm:text-[14px]"
            >
              {Object.entries(catalogSorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {categories.length > 1 || views.length ? (
          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtres">
            {categories.length > 1 ? (
              <>
                <Chip active={!criteria.categorie} onClick={() => update({ categorie: "" })} count={products.length}>
                  Tout
                </Chip>
                {categories.map(([slug, name]) => (
                  <Chip
                    key={slug}
                    active={criteria.categorie === slug}
                    onClick={() => update({ categorie: criteria.categorie === slug ? "" : slug })}
                    count={products.filter((product) => product.category?.slug === slug).length}
                  >
                    {name}
                  </Chip>
                ))}
              </>
            ) : null}
            {categories.length > 1 && views.length ? <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden /> : null}
            {views.map(({ view, count }) => (
              <Chip key={view} active={criteria.vue === view} onClick={() => update({ vue: criteria.vue === view ? "" : view })} count={count}>
                {quickViews[view]}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-muted" aria-live="polite">
          <span className="font-semibold text-ink">{filtered.length}</span> produit{filtered.length > 1 ? "s" : ""}
          {active ? " correspondant à votre recherche" : " au catalogue"}
        </p>
        {active ? (
          <button
            type="button"
            onClick={() => update({ q: "", categorie: "", vue: "" })}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-honey transition hover:text-honey-dark"
          >
            <CloseIcon className="size-3.5" />
            Tout effacer
          </button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <div key={product.id} className="reveal">
              <ProductCard product={product} rating={ratings[product.id]} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-honey/12 text-honey">
            <SearchIcon className="size-6" />
          </span>
          <p className="mt-4 font-display text-[20px] font-semibold text-ink">Aucun produit ne correspond</p>
          <p className="mt-1 max-w-[380px] text-[13.5px] text-muted">
            Essayez un autre mot, ou élargissez les filtres. Vous ne trouvez pas votre bonheur ? Écrivez-nous.
          </p>
          <button
            type="button"
            onClick={() => update({ q: "", categorie: "", vue: "" })}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-honey px-5 text-[14px] font-semibold text-white transition hover:bg-honey-dark"
          >
            Voir tout le catalogue
          </button>
        </div>
      )}
    </>
  );
}
