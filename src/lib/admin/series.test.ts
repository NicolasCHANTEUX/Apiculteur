import assert from "node:assert/strict";
import test from "node:test";
import { bucketByDay, groupDays, lastDays, niceMax, parisDay, summarizePeriod } from "./series.ts";

test("jour de Paris, y compris autour de minuit UTC", () => {
  assert.equal(parisDay("2026-10-12T22:30:00Z"), "2026-10-13");
  assert.equal(parisDay("2026-01-15T23:30:00Z"), "2026-01-16");
  assert.equal(parisDay("2026-01-15T22:30:00Z"), "2026-01-15");
});

test("derniers jours consécutifs, même au changement d'heure", () => {
  const days = lastDays(3, new Date("2026-10-26T08:00:00Z"));
  assert.deepEqual(days, ["2026-10-24", "2026-10-25", "2026-10-26"]);
  const spring = lastDays(90, new Date("2026-04-15T10:00:00Z"));
  assert.equal(spring.length, 90);
  assert.equal(new Set(spring).size, 90);
  assert.equal(spring.at(-1), "2026-04-15");
});

test("cumul par jour, valeurs et événements hors fenêtre", () => {
  const days = ["2026-10-11", "2026-10-12", "2026-10-13"];
  assert.deepEqual(
    bucketByDay(days, [
      { at: "2026-10-12T08:00:00Z" },
      { at: "2026-10-12T21:59:00Z" },
      { at: "2026-10-12T22:01:00Z", value: 5 },
      { at: "2026-09-01T10:00:00Z" },
    ]),
    [0, 2, 5],
  );
});

test("période et période précédente", () => {
  assert.deepEqual(summarizePeriod([1, 1, 2, 4], 2), { total: 6, previous: 2, change: 200 });
  assert.deepEqual(summarizePeriod([0, 0, 3, 0], 2), { total: 3, previous: 0, change: null });
  assert.deepEqual(summarizePeriod([2, 2, 1, 0], 2), { total: 1, previous: 4, change: -75 });
});

test("maximum d'axe arrondi", () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(3), 5);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(18), 20);
  assert.equal(niceMax(21), 25);
  assert.equal(niceMax(1450), 2000);
});

test("regroupement par semaine depuis le dernier jour", () => {
  const days = ["d1", "d2", "d3", "d4", "d5"];
  assert.deepEqual(groupDays(days, [1, 2, 3, 4, 5], 2), [
    { start: "d1", end: "d1", value: 1 },
    { start: "d2", end: "d3", value: 5 },
    { start: "d4", end: "d5", value: 9 },
  ]);
  assert.deepEqual(groupDays(days, [1, 1, 1, 1, 1], 1).length, 5);
  assert.equal(groupDays(lastDays(90, new Date("2026-10-13T10:00:00Z")), Array(90).fill(1), 7).length, 13);
});
