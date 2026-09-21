import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePricedLine,
  eurosToCents,
  getUnitPriceCents,
} from "./pricing.ts";

const tiers = [
  { minQuantity: 1, maxQuantity: 4, unitPrice: 180 },
  { minQuantity: 5, maxQuantity: 9, unitPrice: 165 },
  { minQuantity: 10, maxQuantity: null, unitPrice: 150 },
];

test("convertit les euros en centimes sans erreur de virgule flottante", () => {
  assert.equal(eurosToCents("19.99"), 1999);
});

test("applique les paliers sur leurs bornes inclusives", () => {
  assert.equal(getUnitPriceCents(200, tiers, 4), 18_000);
  assert.equal(getUnitPriceCents(200, tiers, 5), 16_500);
  assert.equal(getUnitPriceCents(200, tiers, 9), 16_500);
  assert.equal(getUnitPriceCents(200, tiers, 10), 15_000);
});

test("utilise le prix de base lorsqu'aucun palier ne correspond", () => {
  assert.equal(
    getUnitPriceCents(42.5, [{ minQuantity: 5, maxQuantity: null, unitPrice: 40 }], 2),
    4250,
  );
});

test("calcule le total d'une ligne en centimes", () => {
  assert.deepEqual(calculatePricedLine(200, tiers, 6), {
    quantity: 6,
    unitPriceCents: 16_500,
    lineTotalCents: 99_000,
  });
});

test("refuse une quantite invalide", () => {
  assert.throws(() => getUnitPriceCents(10, tiers, 0), /quantite/i);
  assert.throws(() => getUnitPriceCents(10, tiers, 1.5), /quantite/i);
});

test("refuse des paliers qui se chevauchent", () => {
  assert.throws(
    () =>
      getUnitPriceCents(
        10,
        [
          { minQuantity: 1, maxQuantity: 5, unitPrice: 10 },
          { minQuantity: 5, maxQuantity: 8, unitPrice: 9 },
        ],
        5,
      ),
    /plusieurs paliers/i,
  );
});
