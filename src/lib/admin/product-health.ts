// Règles d'affichage de l'administration des produits, sans dépendance à
// Next ni à Supabase (testables).

export type StockLevel = "out" | "low" | "ok";

/**
 * Rupture à 0 ; stock faible au seuil d'alerte ou en dessous. Un produit
 * vendu sur réservation ou sur devis n'est jamais « en rupture » : il n'a
 * pas besoin de stock pour être commandé.
 */
export function stockLevel(stock: number, threshold: number | null, purchaseMode = "standard"): StockLevel {
  if (stock <= 0) return purchaseMode === "standard" ? "out" : "ok";
  if (threshold !== null && stock <= threshold) return "low";
  return "ok";
}

// Valeurs du filtre « stock » de la liste admin (paramètre d'URL).
export const stockFilters = {
  rupture: { label: "En rupture", level: "out" },
  faible: { label: "Stock faible", level: "low" },
  disponible: { label: "Disponible", level: "ok" },
} as const satisfies Record<string, { label: string; level: StockLevel }>;

export type StockFilter = keyof typeof stockFilters;

export function isStockFilter(value: string): value is StockFilter {
  return Object.hasOwn(stockFilters, value);
}

export type ReadinessInput = {
  imageCount: number;
  shortDescription: string;
  categoryId: string;
  basePrice: string;
  priceVisibility: string;
  purchaseMode: string;
  stockQuantity: string;
};

export type ReadinessCheck = { label: string; ok: boolean; hint: string };

/**
 * Points à vérifier avant de publier une fiche. Indicatifs : ils ne bloquent
 * pas l'enregistrement, ils aident à ne rien oublier.
 */
export function readinessChecks(input: ReadinessInput): ReadinessCheck[] {
  const price = Number(input.basePrice.replace(/\s/g, "").replace(",", "."));
  const stock = Number(input.stockQuantity || "0");
  return [
    {
      label: "Au moins une photo",
      ok: input.imageCount > 0,
      hint: "La première photo sert de couverture.",
    },
    {
      label: "Description courte",
      ok: input.shortDescription.trim().length >= 20,
      hint: "Une ou deux phrases affichées sur la carte du catalogue.",
    },
    {
      label: "Catégorie choisie",
      ok: input.categoryId !== "",
      hint: "Elle sert de filtre dans le catalogue.",
    },
    {
      label: "Prix renseigné",
      ok: input.priceVisibility !== "visible" || (Number.isFinite(price) && price > 0),
      hint: "Ou choisissez « Prix sur demande ».",
    },
    {
      label: "Disponible à la vente",
      ok: input.purchaseMode !== "standard" || (Number.isFinite(stock) && stock > 0),
      hint: "Stock supérieur à zéro, ou vente sur réservation ou sur devis.",
    },
  ];
}

/** « Essaim » → « Essaim (copie) », dans la limite de 120 caractères. */
export function copyName(name: string): string {
  const suffix = " (copie)";
  return `${name.slice(0, 120 - suffix.length)}${suffix}`;
}

/** Premier lien libre parmi « slug-copie », « slug-copie-2 »… (80 caractères au maximum). */
export function copySlug(slug: string, taken: ReadonlySet<string>): string {
  for (let attempt = 1; attempt < 100; attempt += 1) {
    const suffix = attempt === 1 ? "-copie" : `-copie-${attempt}`;
    const candidate = `${slug.slice(0, 80 - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${slug.slice(0, 60)}-${Date.now().toString(36)}`;
}
