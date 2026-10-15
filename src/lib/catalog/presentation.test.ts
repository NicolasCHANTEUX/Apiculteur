import assert from "node:assert/strict";
import test from "node:test";
import type { PublicProduct } from "../../data/catalog.ts";
import { getImageBadges, getPriceHelp } from "./presentation.ts";

function product(overrides: Partial<PublicProduct>): PublicProduct {
  return {
    id: "p",
    category: { id: "c1", name: "Essaims", slug: "essaims" },
    name: "Essaim",
    slug: "essaim",
    shortDescription: null,
    longDescription: null,
    basePrice: 100,
    priceVisibility: "visible",
    purchaseMode: "standard",
    featured: false,
    stockDisplayMode: "status_label",
    stockStatusLabel: "available",
    stockCustomMessage: null,
    displayedStockQuantity: null,
    seoTitle: null,
    seoDescription: null,
    sku: null,
    tagline: null,
    condition: "new",
    defectDescription: null,
    compareAtPrice: null,
    saleUnit: "essaim",
    deliveryMode: "quote",
    seasonLabel: null,
    publishedAt: null,
    images: [],
    pricingTiers: [],
    attributes: [],
    ...overrides,
  };
}

test("badges : état d'abord, deux au plus", () => {
  assert.deepEqual(getImageBadges(product({})), []);
  assert.deepEqual(getImageBadges(product({ featured: true, stockStatusLabel: "limited" })), ["Populaire", "Dernières unités"]);
  assert.deepEqual(getImageBadges(product({ condition: "used", featured: true, stockStatusLabel: "limited" })), ["Occasion", "Populaire"]);
  assert.deepEqual(getImageBadges(product({ purchaseMode: "reservation" })), ["Nouvelle saison"]);
});

test("aides sous le prix : paliers, devis, sur demande, pièce unique, TVA", () => {
  const tiers = [{ minQuantity: 5, maxQuantity: null, unitPrice: 90 }];
  assert.deepEqual(getPriceHelp(product({ pricingTiers: tiers }), null), ["Prix dégressifs selon la quantité."]);
  assert.deepEqual(getPriceHelp(product({ pricingTiers: tiers }), "franchise"), ["Prix dégressifs selon la quantité.", "TVA non applicable, art. 293 B du CGI."]);
  assert.deepEqual(getPriceHelp(product({}), "assujetti"), ["Prix TTC."]);
  assert.deepEqual(getPriceHelp(product({ purchaseMode: "quote" }), "assujetti"), ["Prix sur devis, selon la quantité et le transport."]);
  assert.deepEqual(getPriceHelp(product({ priceVisibility: "on_request" }), "franchise"), ["Prix communiqué sur demande."]);
  assert.deepEqual(getPriceHelp(product({ condition: "used", stockDisplayMode: "exact", displayedStockQuantity: 1 }), null), ["Pièce unique, prix de cet exemplaire."]);
  // Un essaim neuf dont il reste un exemplaire n'est pas une « pièce unique ».
  assert.deepEqual(getPriceHelp(product({ stockDisplayMode: "exact", displayedStockQuantity: 1 }), null), []);
});
