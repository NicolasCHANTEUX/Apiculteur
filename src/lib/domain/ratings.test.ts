import assert from "node:assert/strict";
import test from "node:test";
import {
  averageByProduct,
  formatAverage,
  summarizeRatings,
} from "./ratings.ts";

test("resume vide sans diviser par zero", () => {
  assert.deepEqual(summarizeRatings([]), {
    count: 0,
    average: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
});

test("moyenne et repartition par etoiles", () => {
  const summary = summarizeRatings([5, 5, 4, 5, 5, 4]);

  assert.equal(summary.count, 6);
  assert.equal(formatAverage(summary.average), "4,7");
  assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 2, 5: 4 });
});

test("refuse une note hors bornes", () => {
  assert.throws(() => summarizeRatings([6]));
  assert.throws(() => summarizeRatings([0]));
  assert.throws(() => summarizeRatings([4.5]));
});

test("regroupe les notes par produit en ignorant les avis sans produit", () => {
  const byProduct = averageByProduct([
    { productId: "a", rating: 5 },
    { productId: "a", rating: 3 },
    { productId: "b", rating: 4 },
    { productId: null, rating: 1 },
  ]);

  assert.equal(byProduct.size, 2);
  assert.equal(byProduct.get("a")?.average, 4);
  assert.equal(byProduct.get("b")?.count, 1);
});
