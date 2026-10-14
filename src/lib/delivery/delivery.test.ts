import assert from "node:assert/strict";
import test from "node:test";
import { geocodeFrenchAddress } from "./geocode.ts";
import { distanceKm, distanceReasons, parsePrefixes, quoteDelivery, zoneFeeCents, zoneMatches, type DeliveryZone } from "./rules.ts";

const caen = { lat: 49.1829, lng: -0.3707 };
const lisieux = { lat: 49.1466, lng: 0.2264 };

const metropole: DeliveryZone = {
  id: "z1",
  name: "Calvados et Manche",
  active: true,
  countries: ["FR"],
  includePrefixes: ["14", "50"],
  excludePrefixes: [],
  feeCents: 4500,
  extraUnitFeeCents: 500,
  maxDistanceKm: 120,
};

test("distance à vol d'oiseau", () => {
  assert.equal(distanceKm(caen, lisieux), 43.6);
  assert.equal(distanceKm(caen, caen), 0);
});

test("préfixes postaux", () => {
  assert.deepEqual(parsePrefixes(" 14, 50 ;27 14 2A"), { prefixes: ["14", "50", "27"], invalid: ["2A"] });
});

test("correspondance d'une zone", () => {
  const target = { country: "FR", postalCode: "14000", distanceKm: 40 };
  assert.ok(zoneMatches(metropole, target));
  assert.ok(!zoneMatches(metropole, { ...target, postalCode: "75001" }));
  assert.ok(!zoneMatches(metropole, { ...target, distanceKm: 130 }));
  assert.ok(!zoneMatches(metropole, { ...target, distanceKm: null }), "distance inconnue : zone non retenue");
  assert.ok(!zoneMatches({ ...metropole, active: false }, target));
  assert.ok(!zoneMatches({ ...metropole, feeCents: 0 }, target));
  const france = { ...metropole, includePrefixes: [], excludePrefixes: ["20", "97", "98"], maxDistanceKm: null };
  assert.ok(zoneMatches(france, { country: "FR", postalCode: "69001", distanceKm: null }));
  assert.ok(!zoneMatches(france, { country: "FR", postalCode: "20000", distanceKm: null }), "Corse exclue");
  assert.ok(!zoneMatches(france, { country: "BE", postalCode: "10000", distanceKm: null }));
});

test("frais : forfait et supplément par unité", () => {
  assert.equal(zoneFeeCents(metropole, 1), 4500);
  assert.equal(zoneFeeCents(metropole, 3), 5500);
});

test("devis de livraison", () => {
  const base = { zones: [metropole], country: "FR", postalCode: "14000", distanceKm: 40 };
  const essaim = { name: "Essaim Buckfast", quantity: 2, deliveryMode: "deliverable" as const };
  assert.deepEqual(quoteDelivery({ ...base, lines: [essaim] }), { kind: "zone", zone: metropole, feeCents: 5000 });
  assert.deepEqual(quoteDelivery({ ...base, lines: [essaim, { name: "Ruchette", quantity: 1, deliveryMode: "pickup_only" }] }), {
    kind: "unavailable",
    products: ["Ruchette"],
  });
  assert.deepEqual(quoteDelivery({ ...base, lines: [{ ...essaim, deliveryMode: "quote" }] }), { kind: "quote", reason: "Transport sur devis pour « Essaim Buckfast »" });
  assert.deepEqual(quoteDelivery({ ...base, postalCode: "75001", lines: [essaim] }), { kind: "quote", reason: "Pas de tarif pour cette adresse" });
});

test("raisons liées à la distance", () => {
  const thresholds = { autoKm: 150, manualKm: 300 };
  assert.deepEqual(distanceReasons(40, thresholds, true), []);
  assert.deepEqual(distanceReasons(180.4, thresholds, true), ["Livraison éloignée (180 km)"]);
  assert.deepEqual(distanceReasons(420, thresholds, true), ["Très longue distance (420 km)"]);
  assert.deepEqual(distanceReasons(null, thresholds, false), ["Adresse non localisée"]);
});

function fakeFetch(responses: ((url: string) => unknown)[]) {
  const calls: string[] = [];
  const impl = (async (url: string | URL | Request) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new TypeError("fetch failed");
    const body = next(String(url));
    if (body instanceof Error) throw body;
    return Response.json(body);
  }) as typeof fetch;
  return { impl, calls };
}

const feature = (score: number, postcode: string, type = "housenumber") => ({
  features: [{ geometry: { coordinates: [-0.37, 49.18] }, properties: { label: "1 Rue Test 14000 Caen", score, postcode, type } }],
});

test("géocodage : adresse précise", async () => {
  const { impl, calls } = fakeFetch([() => feature(0.92, "14000")]);
  assert.deepEqual(await geocodeFrenchAddress({ line1: "1 rue Test", postalCode: "14000", city: "Caen" }, impl), {
    lat: 49.18,
    lng: -0.37,
    label: "1 Rue Test 14000 Caen",
    precision: "address",
  });
  assert.ok(calls[0].startsWith("https://data.geopf.fr/geocodage/search?"));
});

test("géocodage : repli sur la commune, puis sur l'autre service", async () => {
  const lowScore = fakeFetch([() => feature(0.3, "14000"), () => feature(0.8, "14000", "municipality")]);
  assert.equal((await geocodeFrenchAddress({ line1: "lieu-dit inconnu", postalCode: "14000", city: "Caen" }, lowScore.impl))?.precision, "municipality");
  const firstDown = fakeFetch([() => new TypeError("fetch failed"), () => feature(0.9, "14000")]);
  assert.equal((await geocodeFrenchAddress({ line1: "1 rue Test", postalCode: "14000", city: "Caen" }, firstDown.impl))?.precision, "address");
  assert.ok(firstDown.calls[1].startsWith("https://api-adresse.data.gouv.fr/search/?"));
  const homonym = fakeFetch([() => feature(0.95, "50000"), () => feature(0.9, "50000", "municipality")]);
  assert.equal(await geocodeFrenchAddress({ line1: "1 rue Test", postalCode: "14000", city: "Caen" }, homonym.impl), null);
  assert.equal(await geocodeFrenchAddress({ line1: "x", postalCode: "ABC", city: "Caen" }, fakeFetch([]).impl), null);
});

test("formulaire de zone", async () => {
  const { parseZoneForm } = await import("./zone-form.ts");
  const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
  const ok = parseZoneForm(form({ name: " Calvados ", countries: "fr", includePrefixes: "14, 50", excludePrefixes: "", fee: "45,50", extraUnitFee: "5", maxDistanceKm: "120", active: "on" }));
  assert.deepEqual(ok, {
    ok: true,
    value: { name: "Calvados", active: true, countries: ["FR"], includePrefixes: ["14", "50"], excludePrefixes: [], feeCents: 4550, extraUnitFeeCents: 500, maxDistanceKm: 120 },
  });
  const noFee = parseZoneForm(form({ name: "Zone", countries: "FR", fee: "0", active: "on" }));
  assert.ok(!noFee.ok && noFee.errors.fee === "Indiquez un tarif pour activer la zone.");
  const bad = parseZoneForm(form({ name: "Z", countries: "France", includePrefixes: "2A", fee: "abc", maxDistanceKm: "0" }));
  assert.ok(!bad.ok);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["countries", "fee", "includePrefixes", "maxDistanceKm", "name"]);
  const inactive = parseZoneForm(form({ name: "Brouillon", countries: "FR" }));
  assert.ok(inactive.ok && !inactive.value.active && inactive.value.feeCents === 0 && inactive.value.maxDistanceKm === null);
});
