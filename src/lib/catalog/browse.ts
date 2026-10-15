// Recherche, filtres, tri et pagination du catalogue public (CAHIER §5.1),
// sans dépendance à Next (testables). Calculés par le serveur à chaque
// requête : les critères vivent dans l'URL (?q=…&categorie=…&vue=…&tri=…&page=…),
// la sélection est partageable et fonctionne sans JavaScript.

import type { PublicProduct } from "../../data/catalog.ts";

export const catalogSorts = {
  recommandes: "Recommandés",
  nouveautes: "Nouveautés",
  "prix-croissant": "Prix croissant",
  "prix-decroissant": "Prix décroissant",
  nom: "Nom (A à Z)",
} as const;

export type CatalogSort = keyof typeof catalogSorts;

export const quickViews = {
  disponibles: "Disponibles maintenant",
  reservation: "Sur réservation",
  occasion: "Occasion",
} as const;

export type QuickView = keyof typeof quickViews;

/** Produits par page. */
export const CATALOG_PAGE_SIZE = 12;

export type CatalogCriteria = { q: string; categorie: string; vue: QuickView | ""; tri: CatalogSort; page: number };

export const defaultCriteria: CatalogCriteria = { q: "", categorie: "", vue: "", tri: "recommandes", page: 1 };

type Params = { get(name: string): string | null };

/** Critères lus dans l'URL ; toute valeur inconnue est ignorée. */
export function readCriteria(params: Params): CatalogCriteria {
  const text = (name: string) => (params.get(name) ?? "").trim().slice(0, 80);
  const vue = text("vue");
  const tri = text("tri");
  const page = Number(text("page"));
  return {
    q: text("q"),
    categorie: text("categorie"),
    vue: Object.hasOwn(quickViews, vue) ? (vue as QuickView) : "",
    tri: Object.hasOwn(catalogSorts, tri) ? (tri as CatalogSort) : "recommandes",
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 999) : 1,
  };
}

/** Chaîne de requête minimale (critères par défaut omis). */
export function criteriaQuery(criteria: CatalogCriteria): string {
  const params = new URLSearchParams();
  if (criteria.q) params.set("q", criteria.q);
  if (criteria.categorie) params.set("categorie", criteria.categorie);
  if (criteria.vue) params.set("vue", criteria.vue);
  if (criteria.tri !== "recommandes") params.set("tri", criteria.tri);
  if (criteria.page > 1) params.set("page", String(criteria.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Adresse du catalogue après un changement de critère. Toute modification
 * autre que la page revient à la page 1.
 */
export function catalogHref(criteria: CatalogCriteria, patch: Partial<CatalogCriteria>): string {
  const next = { ...criteria, ...patch };
  if (!("page" in patch)) next.page = 1;
  return `/catalogue${criteriaQuery(next)}`;
}

export function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesView(product: PublicProduct, view: QuickView): boolean {
  switch (view) {
    case "disponibles":
      return (
        product.purchaseMode === "standard" &&
        product.stockStatusLabel !== "sold_out" &&
        product.stockStatusLabel !== "coming_soon" &&
        product.stockStatusLabel !== "reservation_open" &&
        product.displayedStockQuantity !== 0
      );
    case "reservation":
      return product.purchaseMode === "reservation" || product.stockStatusLabel === "reservation_open";
    case "occasion":
      return product.condition !== "new";
  }
}

/**
 * Recherche multi-mots, insensible à la casse et aux accents, sur nom,
 * accroche, référence, descriptions, catégorie et caractéristiques.
 */
export function matchesQuery(product: PublicProduct, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [
      product.name,
      product.tagline,
      product.shortDescription,
      product.longDescription,
      product.category?.name,
      product.sku,
      ...product.attributes.map((attribute) => `${attribute.label} ${attribute.value}`),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return words.every((word) => haystack.includes(word));
}

/** Prix le plus bas affichable (paliers compris) ; null si le prix n'est pas affiché. */
function lowestPrice(product: PublicProduct): number | null {
  if (product.priceVisibility !== "visible") return null;
  return Math.min(product.basePrice, ...product.pricingTiers.map((tier) => tier.unitPrice));
}

const byName = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

export function filterAndSort(products: PublicProduct[], criteria: Omit<CatalogCriteria, "page">): PublicProduct[] {
  const filtered = products.filter(
    (product) =>
      (!criteria.categorie || product.category?.slug === criteria.categorie) &&
      (!criteria.vue || matchesView(product, criteria.vue)) &&
      matchesQuery(product, criteria.q),
  );
  if (criteria.tri === "recommandes") return filtered;

  return [...filtered].sort((a, b) => {
    if (criteria.tri === "nouveautes") return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    if (criteria.tri === "nom") return byName.compare(a.name, b.name);
    // Prix non affichés toujours en fin de liste.
    const pa = lowestPrice(a);
    const pb = lowestPrice(b);
    if (pa === null || pb === null) return (pa === null ? 1 : 0) - (pb === null ? 1 : 0);
    return criteria.tri === "prix-croissant" ? pa - pb : pb - pa;
  });
}

export type CatalogPage = {
  /** Produits de la page demandée. */
  items: PublicProduct[];
  /** Nombre de produits correspondant aux critères. */
  total: number;
  /** Page affichée (ramenée à la dernière si elle dépasse). */
  page: number;
  pages: number;
  /** Catégories du catalogue, avec leur nombre de produits. */
  categories: { slug: string; name: string; count: number }[];
  /** Accès rapides qui filtrent vraiment quelque chose. */
  views: { view: QuickView; count: number }[];
};

export function browseCatalog(products: PublicProduct[], criteria: CatalogCriteria, pageSize = CATALOG_PAGE_SIZE): CatalogPage {
  const found = filterAndSort(products, criteria);
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  const page = Math.min(criteria.page, pages);
  const categories = new Map<string, { slug: string; name: string; count: number }>();
  for (const product of products) {
    if (!product.category) continue;
    const current = categories.get(product.category.slug) ?? { slug: product.category.slug, name: product.category.name, count: 0 };
    current.count += 1;
    categories.set(product.category.slug, current);
  }
  return {
    items: found.slice((page - 1) * pageSize, page * pageSize),
    total: found.length,
    page,
    pages,
    categories: [...categories.values()],
    views: (Object.keys(quickViews) as QuickView[])
      .map((view) => ({ view, count: products.filter((product) => matchesView(product, view)).length }))
      .filter(({ count }) => count > 0 && count < products.length),
  };
}

/** Critères actifs, chacun avec l'adresse qui le retire. */
export function activeCriteria(criteria: CatalogCriteria, categories: { slug: string; name: string }[]): { label: string; href: string }[] {
  const active: { label: string; href: string }[] = [];
  if (criteria.q) active.push({ label: `« ${criteria.q} »`, href: catalogHref(criteria, { q: "" }) });
  if (criteria.categorie) {
    const name = categories.find((category) => category.slug === criteria.categorie)?.name ?? criteria.categorie;
    active.push({ label: name, href: catalogHref(criteria, { categorie: "" }) });
  }
  if (criteria.vue) active.push({ label: quickViews[criteria.vue], href: catalogHref(criteria, { vue: "" }) });
  return active;
}

/** Numéros de pages à afficher : premières, voisines et dernières, avec des trous (null). */
export function pageList(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const list: (number | null)[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) list.push(null);
    list.push(value);
  });
  return list;
}
