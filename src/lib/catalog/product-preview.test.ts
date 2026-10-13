import assert from "node:assert/strict";
import test from "node:test";
import { buildPreviewProduct, previewSourceFromForm } from "./product-preview.ts";

const categories = [{ id: "cat-1", name: "Essaims" }];

function source(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return previewSourceFromForm(data);
}

test("aperçu construit depuis la saisie, prix au format français", () => {
  const product = buildPreviewProduct(
    source({
      name: "Essaim Buckfast",
      categoryId: "cat-1",
      basePrice: "160,50",
      priceVisibility: "visible",
      stockDisplayMode: "status_label",
      stockStatusLabel: "limited",
      featured: "on",
      tierMin: ["1", "5"],
      tierMax: ["4", ""],
      tierPrice: ["160,50", "150"],
    }),
    { id: "preview", coverUrl: "https://example.test/a.webp", categories },
  );
  assert.equal(product.name, "Essaim Buckfast");
  assert.equal(product.category?.name, "Essaims");
  assert.equal(product.basePrice, 160.5);
  assert.equal(product.featured, true);
  assert.equal(product.stockStatusLabel, "limited");
  assert.deepEqual(product.pricingTiers, [
    { minQuantity: 1, maxQuantity: 4, unitPrice: 160.5 },
    { minQuantity: 5, maxQuantity: null, unitPrice: 150 },
  ]);
  assert.equal(product.images[0]?.url, "https://example.test/a.webp");
});

test("saisie incomplète ou invalide : valeurs neutres, sans erreur", () => {
  const product = buildPreviewProduct(
    source({ basePrice: "abc", priceVisibility: "n'importe", stockDisplayMode: "exact", stockQuantity: "-3", tierMin: ["x"], tierPrice: ["10"] }),
    { id: "preview", coverUrl: null, categories },
  );
  assert.equal(product.name, "Nom du produit");
  assert.equal(product.basePrice, 0);
  assert.equal(product.priceVisibility, "visible");
  assert.equal(product.displayedStockQuantity, 0);
  assert.deepEqual(product.pricingTiers, []);
  assert.deepEqual(product.images, []);
});

test("le libellé de stock n'est repris que dans son mode d'affichage", () => {
  const product = buildPreviewProduct(
    source({ stockDisplayMode: "hidden", stockStatusLabel: "available", stockCustomMessage: "Saison 2027" }),
    { id: "preview", coverUrl: null, categories },
  );
  assert.equal(product.stockStatusLabel, null);
  assert.equal(product.stockCustomMessage, null);
});
