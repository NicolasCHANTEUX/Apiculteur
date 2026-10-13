import assert from "node:assert/strict";
import test from "node:test";
import type { PublicProduct } from "../../data/catalog.ts";
import { criteriaQuery, filterAndSort, matchesQuery, readCriteria } from "./browse.ts";

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

const products = [
  product({ id: "a", name: "Essaim Buckfast", basePrice: 160, publishedAt: "2026-03-01", attributes: [{ label: "Race", value: "Buckfast", unit: null }] }),
  product({ id: "b", name: "Reine Carnica", category: { id: "c2", name: "Reines", slug: "reines" }, basePrice: 45, publishedAt: "2026-05-01" }),
  product({ id: "c", name: "Réservation 2027", purchaseMode: "reservation", priceVisibility: "on_request", basePrice: 0, publishedAt: "2026-09-01" }),
  product({ id: "d", name: "Ruchette d’occasion", condition: "used", basePrice: 65, pricingTiers: [{ minQuantity: 2, maxQuantity: null, unitPrice: 40 }] }),
];

const ids = (list: PublicProduct[]) => list.map((item) => item.id).join("");
const base = { q: "", categorie: "", vue: "" as const, tri: "recommandes" as const };

test("critères lus dans l'URL, valeurs inconnues ignorées", () => {
  const criteria = readCriteria(new URLSearchParams("q=reine&categorie=reines&vue=xxx&tri=prix-croissant"));
  assert.deepEqual(criteria, { q: "reine", categorie: "reines", vue: "", tri: "prix-croissant" });
  assert.equal(criteriaQuery(criteria), "?q=reine&categorie=reines&tri=prix-croissant");
  assert.equal(criteriaQuery(base), "");
});

test("recherche multi-mots sans accents, caractéristiques comprises", () => {
  assert.equal(matchesQuery(products[0], "buckfast essaim"), true);
  assert.equal(matchesQuery(products[2], "reservation"), true);
  assert.equal(matchesQuery(products[0], "buckfast reine"), false);
});

test("filtres rapides et catégorie", () => {
  assert.equal(ids(filterAndSort(products, { ...base, vue: "disponibles" })), "abd");
  assert.equal(ids(filterAndSort(products, { ...base, vue: "reservation" })), "c");
  assert.equal(ids(filterAndSort(products, { ...base, vue: "occasion" })), "d");
  assert.equal(ids(filterAndSort(products, { ...base, categorie: "reines" })), "b");
});

test("tri par prix (paliers compris, prix non affichés en fin) et nouveautés", () => {
  assert.equal(ids(filterAndSort(products, { ...base, tri: "prix-croissant" })), "dbac");
  assert.equal(ids(filterAndSort(products, { ...base, tri: "prix-decroissant" })), "abdc");
  assert.equal(ids(filterAndSort(products, { ...base, tri: "nouveautes" })), "cbad");
});
