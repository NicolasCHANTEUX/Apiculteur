// Présentation d’un produit sur le site public (CAHIER §5.2) : badges et
// précisions sous le prix. Sans dépendance à Next (testables).

import type { PublicProduct } from "../../data/catalog.ts";

// Badges posés sur la photo (carte et fiche produit), deux au plus, par
// ordre d'importance : état du matériel, mise en avant, rareté, saison.
export function getImageBadges(product: PublicProduct): string[] {
  const badges: string[] = [];
  if (product.condition === "used") badges.push("Occasion");
  if (product.condition === "second_choice") badges.push("Second choix");
  if (product.featured) badges.push("Populaire");
  if (product.stockStatusLabel === "limited") badges.push("Dernières unités");
  if (
    product.purchaseMode === "reservation" ||
    product.stockStatusLabel === "reservation_open"
  ) {
    badges.push("Nouvelle saison");
  }
  return badges.slice(0, 2);
}

/**
 * Précisions sous le prix (CAHIER §5.2). `vatMode` : régime des informations
 * légales publiées ; sans version publiée, rien n'est affirmé sur la TVA.
 */
export function getPriceHelp(product: PublicProduct, vatMode: "franchise" | "assujetti" | null): string[] {
  const help: string[] = [];
  if (product.purchaseMode === "quote") help.push("Prix sur devis, selon la quantité et le transport.");
  else if (product.priceVisibility === "on_request") help.push("Prix communiqué sur demande.");
  else if (product.priceVisibility === "visible" && product.pricingTiers.length > 0) help.push("Prix dégressifs selon la quantité.");
  if (product.condition !== "new" && product.stockDisplayMode === "exact" && product.displayedStockQuantity === 1) {
    help.push("Pièce unique, prix de cet exemplaire.");
  }
  if (product.priceVisibility === "visible" && product.purchaseMode !== "quote") {
    if (vatMode === "franchise") help.push("TVA non applicable, art. 293 B du CGI.");
    if (vatMode === "assujetti") help.push("Prix TTC.");
  }
  return help;
}
