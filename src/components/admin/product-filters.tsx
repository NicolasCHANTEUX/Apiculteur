"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/admin/action-button";
import { adminButton, adminField, adminInput } from "@/components/admin/admin-ui";
import { SearchIcon } from "@/components/icons";
import { stockFilters } from "@/lib/admin/product-health";

// Recherche et filtres de la liste produits. Sans JavaScript, le formulaire
// GET fonctionne tel quel ; avec, les listes s'appliquent dès qu'on les
// change et l'URL ne garde que les filtres remplis.
export function ProductFilters({
  filters,
  categories,
}: {
  filters: { q: string; categorie: string; statut: string; stock: string };
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = Boolean(filters.q || filters.categorie || filters.stock);

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim()) params.set(name, value.trim());
    }
    const query = params.toString();
    startTransition(() => router.replace(query ? `/admin/produits?${query}` : "/admin/produits", { scroll: false }));
  }

  return (
    <form
      action="/admin/produits"
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-5"
    >
      {filters.statut ? <input type="hidden" name="statut" value={filters.statut} /> : null}
      <div className="relative min-w-[200px] flex-[1_1_260px]">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="product-search" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="product-search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Rechercher par nom ou référence"
          className={`${adminInput} h-10 pl-9`}
        />
      </div>
      <label htmlFor="product-category" className="sr-only">
        Catégorie
      </label>
      <select
        id="product-category"
        name="categorie"
        defaultValue={filters.categorie}
        onChange={(event) => event.currentTarget.form && apply(event.currentTarget.form)}
        className={`${adminField} h-10 min-w-[160px] flex-1 sm:flex-none`}
      >
        <option value="">Toutes les catégories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <label htmlFor="product-stock" className="sr-only">
        Niveau de stock
      </label>
      <select
        id="product-stock"
        name="stock"
        defaultValue={filters.stock}
        onChange={(event) => event.currentTarget.form && apply(event.currentTarget.form)}
        className={`${adminField} h-10 min-w-[140px] flex-1 sm:flex-none`}
      >
        <option value="">Tous les stocks</option>
        {Object.entries(stockFilters).map(([value, filter]) => (
          <option key={value} value={value}>
            {filter.label}
          </option>
        ))}
      </select>
      <button type="submit" className={adminButton.secondary}>
        {pending ? <Spinner /> : null}
        Rechercher
      </button>
      {active ? (
        <Link
          href={filters.statut ? `/admin/produits?statut=${filters.statut}` : "/admin/produits"}
          scroll={false}
          className="px-1 text-[13px] font-medium text-honey-dark hover:underline"
        >
          Effacer les filtres
        </Link>
      ) : null}
    </form>
  );
}
