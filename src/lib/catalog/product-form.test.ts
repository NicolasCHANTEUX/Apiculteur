import assert from "node:assert/strict";
import test from "node:test";
import { parseEurosToCents, parseProductForm, slugify } from "./product-form.ts";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const base = {
  name: "Essaim Buckfast sur 5 cadres",
  basePrice: "160",
  status: "published",
  priceVisibility: "visible",
  purchaseMode: "standard",
  condition: "new",
  deliveryMode: "pickup_only",
  stockDisplayMode: "status_label",
  stockStatusLabel: "available",
  stockQuantity: "12",
};

test("slug sans accents ni ponctuation", () => {
  assert.equal(slugify("Reine fécondée Buckfast — 2027 !"), "reine-fecondee-buckfast-2027");
  assert.equal(slugify("  --Été--  "), "ete");
});

test("prix en euros vers centimes", () => {
  assert.equal(parseEurosToCents("145"), 14500);
  assert.equal(parseEurosToCents("145,5"), 14550);
  assert.equal(parseEurosToCents("1 450.05"), 145005);
  assert.equal(parseEurosToCents("-3"), null);
  assert.equal(parseEurosToCents("12,345"), null);
  assert.equal(parseEurosToCents("abc"), null);
});

test("formulaire valide : slug déduit, paliers triés, lignes vides ignorées", () => {
  const result = parseProductForm(
    form({
      ...base,
      compareAtPrice: "175",
      tierMin: ["5", "1", ""],
      tierMax: ["", "4", ""],
      tierPrice: ["150", "160", ""],
      attrLabel: ["Race", ""],
      attrValue: ["Buckfast", ""],
      attrUnit: ["", ""],
      featured: "on",
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.product.slug, "essaim-buckfast-sur-5-cadres");
  assert.equal(result.product.base_price, "160.00");
  assert.equal(result.product.compare_at_price, "175.00");
  assert.equal(result.product.featured, true);
  assert.equal(result.product.sale_unit, "unité");
  assert.deepEqual(result.tiers, [
    { min: 1, max: 4, price: "160.00" },
    { min: 5, max: null, price: "150.00" },
  ]);
  assert.deepEqual(result.attributes, [{ label: "Race", value: "Buckfast", unit: "" }]);
});

test("erreurs de champs explicites", () => {
  const result = parseProductForm(
    form({
      ...base,
      name: "X",
      basePrice: "dix",
      sku: "réf avec espace",
      stockDisplayMode: "custom_message",
      stockCustomMessage: "",
      status: "inconnu",
    }),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.name);
  assert.ok(result.errors.basePrice);
  assert.ok(result.errors.sku);
  assert.ok(result.errors.stockCustomMessage);
  assert.ok(result.errors.status);
});

test("prix barré inférieur au prix refusé", () => {
  const result = parseProductForm(form({ ...base, compareAtPrice: "120" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.compareAtPrice, /supérieur/);
});

test("paliers qui se chevauchent ou mal formés refusés", () => {
  const overlap = parseProductForm(
    form({ ...base, tierMin: ["1", "4"], tierMax: ["5", ""], tierPrice: ["160", "150"] }),
  );
  assert.equal(overlap.ok, false);
  if (!overlap.ok) assert.match(overlap.errors.tiers, /chevauchent/);

  const openThenMore = parseProductForm(
    form({ ...base, tierMin: ["1", "10"], tierMax: ["", ""], tierPrice: ["160", "150"] }),
  );
  assert.equal(openThenMore.ok, false);

  const inverted = parseProductForm(
    form({ ...base, tierMin: ["5"], tierMax: ["2"], tierPrice: ["160"] }),
  );
  assert.equal(inverted.ok, false);
});

test("le libellé de stock n'est gardé que pour son mode", () => {
  const result = parseProductForm(
    form({ ...base, stockDisplayMode: "exact", stockStatusLabel: "available" }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.product.stock_status_label, "");
});
