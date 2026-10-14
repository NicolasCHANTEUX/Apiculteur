import assert from "node:assert/strict";
import test from "node:test";
import type { PublicProduct } from "../../data/catalog.ts";
import { parseOrderContact, priceRequest, reviewReasons } from "./request.ts";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const contact = {
  name: "  Claire   Martin ",
  email: "Claire@Example.TEST",
  phone: "06 12 34 56 78",
  deliveryMethod: "pickup",
  requestedDate: "2026-11-02",
  message: "Bonjour",
};

test("coordonnées valides : nom nettoyé, email normalisé, adresse ignorée en retrait", () => {
  const result = parseOrderContact(form({ ...contact, addressLine1: "ignorée" }), "2026-10-14");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.name, "Claire Martin");
  assert.equal(result.value.email, "claire@example.test");
  assert.equal(result.value.addressLine1, "");
});

test("livraison : adresse, code postal et ville exigés", () => {
  const result = parseOrderContact(form({ ...contact, deliveryMethod: "delivery", postalCode: "1400" }), "2026-10-14");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["addressLine1", "city", "postalCode"]);
});

test("champs obligatoires, téléphone et date contrôlés", () => {
  const result = parseOrderContact(form({ name: "C", email: "pas-un-email", phone: "abc", deliveryMethod: "", requestedDate: "2026-10-01" }), "2026-10-14");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["deliveryMethod", "email", "name", "phone", "requestedDate"]);
  const far = parseOrderContact(form({ ...contact, requestedDate: "2029-01-01" }), "2026-10-14");
  assert.equal(far.ok, false);
});

function product(overrides: Partial<PublicProduct>): PublicProduct {
  return {
    id: "p", category: null, name: "Essaim", slug: "essaim", shortDescription: null, longDescription: null,
    basePrice: 160, priceVisibility: "visible", purchaseMode: "standard", featured: false,
    stockDisplayMode: "status_label", stockStatusLabel: "available", stockCustomMessage: null,
    displayedStockQuantity: null, seoTitle: null, seoDescription: null, sku: null, tagline: null,
    condition: "new", defectDescription: null, compareAtPrice: null, saleUnit: "essaim",
    deliveryMode: "pickup_only", seasonLabel: null, publishedAt: null, images: [],
    pricingTiers: [{ minQuantity: 1, maxQuantity: 4, unitPrice: 160 }, { minQuantity: 5, maxQuantity: null, unitPrice: 150 }],
    attributes: [],
    ...overrides,
  };
}

const catalog = [
  product({ id: "a" }),
  product({ id: "b", name: "Réservation 2027", purchaseMode: "reservation", priceVisibility: "on_request" }),
  product({ id: "c", name: "Reine", stockDisplayMode: "exact", displayedStockQuantity: 2, pricingTiers: [], basePrice: 45 }),
  product({ id: "d", name: "Épuisé", stockStatusLabel: "sold_out" }),
];

test("prix recalculés par palier ; prix non affiché à confirmer", () => {
  const priced = priceRequest([{ id: "a", quantity: 5 }, { id: "b", quantity: 3 }], catalog);
  assert.deepEqual(priced.problems, []);
  assert.equal(priced.lines[0].unitPriceCents, 15_000);
  assert.equal(priced.lines[1].unitPriceCents, null);
  assert.equal(priced.subtotalCents, 75_000);
  assert.equal(priced.totalQuantity, 8);
});

test("produits retirés, épuisés ou au-delà du stock affiché signalés", () => {
  const priced = priceRequest([{ id: "x", quantity: 1 }, { id: "d", quantity: 1 }, { id: "c", quantity: 3 }], catalog);
  assert.equal(priced.problems.length, 3);
  assert.equal(priced.lines.length, 0);
  assert.match(priced.problems[2], /Il ne reste que 2/);
});

test("raisons d'attention", () => {
  const priced = priceRequest([{ id: "a", quantity: 30 }, { id: "b", quantity: 1 }], catalog);
  assert.deepEqual(reviewReasons(priced, "delivery", 30), [
    "Grande quantité (31 unités)",
    "Livraison à organiser",
    "Réservation",
    "Prix à confirmer",
  ]);
  assert.deepEqual(reviewReasons(priceRequest([{ id: "a", quantity: 1 }], catalog), "pickup", 30), []);
});
