import assert from "node:assert/strict";
import test from "node:test";
import type { PublicProduct } from "../../data/catalog.ts";
import { activeCriteria, browseCatalog, catalogHref, criteriaQuery, defaultCriteria, filterAndSort, matchesQuery, matchesView, pageList, readCriteria } from "./browse.ts";

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
  const criteria = readCriteria(new URLSearchParams("q=reine&categorie=reines&vue=xxx&tri=prix-croissant&page=abc"));
  assert.deepEqual(criteria, { q: "reine", categorie: "reines", vue: "", tri: "prix-croissant", page: 1 });
  assert.equal(criteriaQuery(criteria), "?q=reine&categorie=reines&tri=prix-croissant");
  assert.equal(criteriaQuery(defaultCriteria), "");
  assert.equal(readCriteria(new URLSearchParams("page=3")).page, 3);
  assert.equal(readCriteria(new URLSearchParams("page=-2")).page, 1);
});

test("recherche multi-mots sans accents, caractéristiques comprises", () => {
  assert.equal(matchesQuery(products[0], "buckfast essaim"), true);
  assert.equal(matchesQuery(products[2], "reservation"), true);
  assert.equal(matchesQuery(products[0], "buckfast reine"), false);
});

test("filtres rapides et catégorie", () => {
  assert.equal(matchesView(product({ stockStatusLabel: "reservation_open" }), "disponibles"), false);
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

test("tri par nom, recherche dans la description longue", () => {
  assert.equal(ids(filterAndSort([...products].reverse(), { ...base, tri: "nom" })), "abcd");
  assert.equal(matchesQuery(product({ longDescription: "Souche très douce" }), "douce"), true);
});

test("liens : tout changement revient à la page 1, la pagination garde les critères", () => {
  const current = { ...defaultCriteria, q: "essaim", page: 3 };
  assert.equal(catalogHref(current, { tri: "nom" }), "/catalogue?q=essaim&tri=nom");
  assert.equal(catalogHref(current, { page: 2 }), "/catalogue?q=essaim&page=2");
  assert.equal(catalogHref(current, { q: "" }), "/catalogue");
});

test("pagination et compteurs", () => {
  const many = Array.from({ length: 30 }, (_, index) => product({ id: `p${index}`, name: `Essaim ${index}` }));
  const first = browseCatalog(many, defaultCriteria);
  assert.deepEqual([first.items.length, first.total, first.page, first.pages], [12, 30, 1, 3]);
  const last = browseCatalog(many, { ...defaultCriteria, page: 9 });
  assert.deepEqual([last.items.length, last.page], [6, 3], "page trop grande ramenée à la dernière");
  const catalog = browseCatalog(products, defaultCriteria);
  assert.deepEqual(catalog.categories, [{ slug: "essaims", name: "Essaims", count: 3 }, { slug: "reines", name: "Reines", count: 1 }]);
  assert.deepEqual(catalog.views.map((view) => `${view.view}:${view.count}`), ["disponibles:3", "reservation:1", "occasion:1"]);
});

test("critères actifs retirables un par un", () => {
  const current = { ...defaultCriteria, q: "buckfast", categorie: "reines", vue: "disponibles" as const, tri: "nom" as const };
  assert.deepEqual(activeCriteria(current, [{ slug: "reines", name: "Reines" }]), [
    { label: "« buckfast »", href: "/catalogue?categorie=reines&vue=disponibles&tri=nom" },
    { label: "Reines", href: "/catalogue?q=buckfast&vue=disponibles&tri=nom" },
    { label: "Disponibles maintenant", href: "/catalogue?q=buckfast&categorie=reines&tri=nom" },
  ]);
});

test("numéros de pages avec trous", () => {
  assert.deepEqual(pageList(1, 1), [1]);
  assert.deepEqual(pageList(1, 3), [1, 2, 3]);
  assert.deepEqual(pageList(5, 9), [1, null, 4, 5, 6, null, 9]);
});
