import assert from "node:assert/strict";
import test from "node:test";
import {
  copyName,
  copySlug,
  isStockFilter,
  readinessChecks,
  stockLevel,
  type ReadinessInput,
} from "./product-health.ts";

test("niveau de stock : rupture, faible au seuil, disponible", () => {
  assert.equal(stockLevel(0, 3), "out");
  assert.equal(stockLevel(0, null), "out");
  assert.equal(stockLevel(3, 3), "low");
  assert.equal(stockLevel(4, 3), "ok");
  assert.equal(stockLevel(1, null), "ok");
});

test("réservation ou devis : jamais en rupture, seuil toujours signalé", () => {
  assert.equal(stockLevel(0, 3, "reservation"), "ok");
  assert.equal(stockLevel(0, null, "quote"), "ok");
  assert.equal(stockLevel(2, 3, "reservation"), "low");
  assert.equal(stockLevel(0, 3, "standard"), "out");
});

test("filtre de stock limité aux valeurs connues", () => {
  assert.equal(isStockFilter("faible"), true);
  assert.equal(isStockFilter("toString"), false);
  assert.equal(isStockFilter(""), false);
});

const ready: ReadinessInput = {
  imageCount: 2,
  shortDescription: "Essaim doux et productif, idéal pour démarrer.",
  categoryId: "c0ffee00-0000-4000-8000-000000000000",
  basePrice: "160",
  priceVisibility: "visible",
  purchaseMode: "standard",
  stockQuantity: "4",
};

test("fiche complète : tous les points sont validés", () => {
  assert.ok(readinessChecks(ready).every((check) => check.ok));
});

test("fiche incomplète : photo, description, catégorie, prix et stock signalés", () => {
  const checks = readinessChecks({
    imageCount: 0,
    shortDescription: "Court",
    categoryId: "",
    basePrice: "0",
    priceVisibility: "visible",
    purchaseMode: "standard",
    stockQuantity: "0",
  });
  assert.deepEqual(
    checks.filter((check) => !check.ok).map((check) => check.label),
    ["Au moins une photo", "Description courte", "Catégorie choisie", "Prix renseigné", "Disponible à la vente"],
  );
});

test("prix sur demande et vente sur réservation n'exigent ni prix ni stock", () => {
  const checks = readinessChecks({
    ...ready,
    basePrice: "",
    priceVisibility: "on_request",
    purchaseMode: "reservation",
    stockQuantity: "0",
  });
  assert.ok(checks.every((check) => check.ok));
});

test("prix au format français accepté", () => {
  const price = readinessChecks({ ...ready, basePrice: "145,50" }).find((check) => check.label === "Prix renseigné");
  assert.equal(price?.ok, true);
});

test("nom de copie limité à 120 caractères", () => {
  assert.equal(copyName("Essaim Buckfast"), "Essaim Buckfast (copie)");
  assert.equal(copyName("x".repeat(120)).length, 120);
});

test("lien de copie : premier libre, sans tiret final ni dépassement", () => {
  assert.equal(copySlug("essaim", new Set()), "essaim-copie");
  assert.equal(copySlug("essaim", new Set(["essaim-copie", "essaim-copie-2"])), "essaim-copie-3");
  const long = `${"a".repeat(74)}-${"b".repeat(5)}`;
  const slug = copySlug(long, new Set());
  assert.ok(slug.length <= 80);
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});
