import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, SlidersIcon } from "@/components/icons";
import { activeCriteria, catalogHref, pageList, quickViews, type CatalogCriteria, type CatalogPage } from "@/lib/catalog/browse";

// Filtres, critères actifs et pagination du catalogue (CAHIER §5.1) : de
// simples liens calculés par le serveur, utilisables sans JavaScript.

function Chip({ href, active, children, count }: { href: string; active: boolean; children: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition ${
        active
          ? "border-honey bg-honey text-white shadow-[0_4px_12px_-4px_rgb(217_154_43/0.7)]"
          : "border-line bg-white text-body hover:border-honey/50 hover:text-ink"
      }`}
    >
      {children}
      {count !== undefined ? <span className={`text-[11.5px] tabular-nums ${active ? "text-white/80" : "text-muted"}`}>{count}</span> : null}
    </Link>
  );
}

function FilterLinks({ criteria, catalog, total, layout }: { criteria: CatalogCriteria; catalog: CatalogPage; total: number; layout: "row" | "wrap" }) {
  const categories = catalog.categories.length > 1 ? catalog.categories : [];
  return (
    <div className={layout === "row" ? "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" : "flex flex-wrap gap-2"} role="group" aria-label="Filtres">
      {categories.length ? (
        <>
          <Chip href={catalogHref(criteria, { categorie: "" })} active={!criteria.categorie} count={total}>
            Tout
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.slug}
              href={catalogHref(criteria, { categorie: criteria.categorie === category.slug ? "" : category.slug })}
              active={criteria.categorie === category.slug}
              count={category.count}
            >
              {category.name}
            </Chip>
          ))}
        </>
      ) : null}
      {layout === "row" && categories.length && catalog.views.length ? <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden /> : null}
      {catalog.views.map(({ view, count }) => (
        <Chip key={view} href={catalogHref(criteria, { vue: criteria.vue === view ? "" : view })} active={criteria.vue === view} count={count}>
          {quickViews[view]}
        </Chip>
      ))}
    </div>
  );
}

/** Filtres : rangée sur grand écran, repliables sur mobile (élément natif, sans JavaScript). */
export function CatalogFilters({ criteria, catalog, total }: { criteria: CatalogCriteria; catalog: CatalogPage; total: number }) {
  if (catalog.categories.length < 2 && catalog.views.length === 0) return null;
  const selected = (criteria.categorie ? 1 : 0) + (criteria.vue ? 1 : 0);
  return (
    <>
      <details className="group mt-4 sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-line bg-cream/60 px-4 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersIcon className="size-4 text-honey" />
            Filtres
            {selected ? <span className="rounded-full bg-honey px-1.5 py-px text-[11.5px] text-white tabular-nums">{selected}</span> : null}
          </span>
          <ChevronDownIcon className="size-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="pt-3">
          <FilterLinks criteria={criteria} catalog={catalog} total={total} layout="wrap" />
        </div>
      </details>
      <div className="mt-4 hidden sm:block">
        <FilterLinks criteria={criteria} catalog={catalog} total={total} layout="row" />
      </div>
    </>
  );
}

/** Nombre de résultats, critères actifs retirables un par un, « Tout effacer ». */
export function CatalogSummary({ criteria, catalog }: { criteria: CatalogCriteria; catalog: CatalogPage }) {
  const active = activeCriteria(criteria, catalog.categories);
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13.5px] text-muted" aria-live="polite">
        <span className="font-semibold text-ink">{catalog.total}</span> produit{catalog.total > 1 ? "s" : ""}
        {active.length ? " correspondant à votre recherche" : " au catalogue"}
        {catalog.pages > 1 ? ` · page ${catalog.page} sur ${catalog.pages}` : ""}
      </p>
      {active.length ? (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Critères actifs">
          {active.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                scroll={false}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-honey/12 pr-2.5 pl-3 text-[12.5px] font-medium text-honey-dark transition hover:bg-honey/20"
              >
                {item.label}
                <CloseIcon className="size-3.5" aria-hidden />
                <span className="sr-only">(retirer ce critère)</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/catalogue" scroll={false} className="ml-1 text-[13px] font-semibold text-honey transition hover:text-honey-dark">
              Tout effacer
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function CatalogPagination({ criteria, catalog }: { criteria: CatalogCriteria; catalog: CatalogPage }) {
  if (catalog.pages < 2) return null;
  const href = (page: number) => `${catalogHref(criteria, { page })}#resultats`;
  const step = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-[14px] font-medium transition";
  return (
    <nav aria-label="Pages du catalogue" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {catalog.page > 1 ? (
        <Link href={href(catalog.page - 1)} className={`${step} border-line bg-white text-ink hover:border-honey/50`} rel="prev">
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline">Précédente</span>
          <span className="sr-only sm:hidden">Page précédente</span>
        </Link>
      ) : null}
      {pageList(catalog.page, catalog.pages).map((page, index) =>
        page === null ? (
          <span key={`gap-${index}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-current={page === catalog.page ? "page" : undefined}
            aria-label={`Page ${page}`}
            className={`${step} tabular-nums ${page === catalog.page ? "border-honey bg-honey text-white" : "border-line bg-white text-ink hover:border-honey/50"}`}
          >
            {page}
          </Link>
        ),
      )}
      {catalog.page < catalog.pages ? (
        <Link href={href(catalog.page + 1)} className={`${step} border-line bg-white text-ink hover:border-honey/50`} rel="next">
          <span className="hidden sm:inline">Suivante</span>
          <span className="sr-only sm:hidden">Page suivante</span>
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
