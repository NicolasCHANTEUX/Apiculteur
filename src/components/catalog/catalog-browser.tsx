"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { getAvailability } from "@/components/catalog/product-display";
import { SearchIcon, SlidersIcon } from "@/components/icons";
import type { PublicProduct } from "@/data/catalog";
import type { RatingSummary } from "@/lib/domain/ratings";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const selectClass =
  "h-[38px] w-full truncate rounded-full border border-line bg-white pr-8 pl-3.5 text-[13px] text-ink outline-none focus:border-honey sm:w-[170px]";

export function CatalogBrowser({
  products,
  ratings,
}: {
  products: PublicProduct[];
  ratings: Record<string, RatingSummary>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");

  const categories = useMemo(
    () =>
      [
        ...new Map(
          products
            .filter((product) => product.category)
            .map((product) => [product.category!.slug, product.category!.name]),
        ),
      ].sort((a, b) => a[1].localeCompare(b[1], "fr")),
    [products],
  );

  const availabilityLabels = useMemo(
    () => [
      ...new Set(
        products
          .map((product) => getAvailability(product)?.label)
          .filter((label): label is string => Boolean(label)),
      ),
    ],
    [products],
  );

  const filtered = products.filter((product) => {
    if (category && product.category?.slug !== category) return false;
    if (availability && getAvailability(product)?.label !== availability) {
      return false;
    }
    if (query.trim()) {
      const haystack = normalize(
        [product.name, product.shortDescription, product.category?.name]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(normalize(query.trim()));
    }
    return true;
  });

  const resetFilters = () => {
    setQuery("");
    setCategory("");
    setAvailability("");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
        <SlidersIcon className="hidden size-4 text-muted sm:block" />
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Rechercher un essaim</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher…"
            className="h-[38px] w-full rounded-full border border-line/70 bg-white pr-4 pl-9 text-[13px] text-ink outline-none placeholder:text-muted focus:border-honey"
          />
        </label>
        {categories.length > 1 ? (
          <label className="w-full sm:w-auto">
            <span className="sr-only">Catégorie</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClass}
            >
              <option value="">Toutes catégories</option>
              {categories.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {availabilityLabels.length > 1 ? (
          <label className="w-full sm:w-auto">
            <span className="sr-only">Disponibilité</span>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              className={selectClass}
            >
              <option value="">Toutes disponibilités</option>
              {availabilityLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="text-[13px] text-muted" aria-live="polite">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              rating={ratings[product.id]}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-line bg-white p-8 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            Aucun essaim ne correspond à votre recherche
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 text-[13px] font-semibold text-honey hover:text-honey-dark"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </>
  );
}
