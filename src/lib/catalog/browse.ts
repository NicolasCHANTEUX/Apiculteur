// Tri et filtres du catalogue public, sans dépendance à Next (testables).
// Les critères vivent dans l'URL (?q=…&categorie=…&vue=…&tri=…) pour que
// chaque recherche puisse être partagée.

import type { PublicProduct } from "../../data/catalog.ts";

export const catalogSorts = {
  recommandes: "Recommandés",
  "prix-croissant": "Prix croissant",
  "prix-decroissant": "Prix décroissant",
  nouveautes: "Nouveautés",
} as const;

export type CatalogSort = keyof typeof catalogSorts;

export const quickViews = {
  disponibles: "Disponibles",
  reservation: "Sur réservation",
  occasion: "Occasion",
} as const;

export type QuickView = keyof typeof quickViews;

export type CatalogCriteria = { q: string; categorie: string; vue: QuickView | ""; tri: CatalogSort };

type Params = { get(name: string): string | null };

/** Critères lus dans l'URL ; toute valeur inconnue est ignorée. */
export function readCriteria(params: Params): CatalogCriteria {
  const text = (name: string) => (params.get(name) ?? "").trim().slice(0, 80);
  const vue = text("vue");
  const tri = text("tri");
  return {
    q: text("q"),
    categorie: text("categorie"),
    vue: Object.hasOwn(quickViews, vue) ? (vue as QuickView) : "",
    tri: Object.hasOwn(catalogSorts, tri) ? (tri as CatalogSort) : "recommandes",
  };
}

/** Chaîne de requête minimale (critères par défaut omis). */
export function criteriaQuery(criteria: CatalogCriteria): string {
  const params = new URLSearchParams();
  if (criteria.q) params.set("q", criteria.q);
  if (criteria.categorie) params.set("categorie", criteria.categorie);
  if (criteria.vue) params.set("vue", criteria.vue);
  if (criteria.tri !== "recommandes") params.set("tri", criteria.tri);
  const query = params.toString();
  return query ? `?${query}` : "";
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

/** Recherche multi-mots, sans accents, sur nom, accroche, descriptions, catégorie et caractéristiques. */
export function matchesQuery(product: PublicProduct, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [
      product.name,
      product.tagline,
      product.shortDescription,
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

export function filterAndSort(products: PublicProduct[], criteria: CatalogCriteria): PublicProduct[] {
  const filtered = products.filter(
    (product) =>
      (!criteria.categorie || product.category?.slug === criteria.categorie) &&
      (!criteria.vue || matchesView(product, criteria.vue)) &&
      matchesQuery(product, criteria.q),
  );
  if (criteria.tri === "recommandes") return filtered;

  return [...filtered].sort((a, b) => {
    if (criteria.tri === "nouveautes") {
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    }
    // Prix non affichés toujours en fin de liste.
    const pa = lowestPrice(a);
    const pb = lowestPrice(b);
    if (pa === null || pb === null) return (pa === null ? 1 : 0) - (pb === null ? 1 : 0);
    return criteria.tri === "prix-croissant" ? pa - pb : pb - pa;
  });
}
