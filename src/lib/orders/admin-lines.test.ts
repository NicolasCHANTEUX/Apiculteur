import assert from "node:assert/strict";
import test from "node:test";
import { centsToInput, linesPayload, parseLines, parseManualSale, parseProposal, tierUnitPriceCents } from "./admin-lines.ts";

const buckfast = { id: "p1", name: "Essaim Buckfast", basePriceCents: 16000, tiers: [{ min: 5, max: 9, priceCents: 15500 }, { min: 10, max: null, priceCents: 15000 }] };
const carnica = { id: "p2", name: "Essaim Carnica", basePriceCents: 16500, tiers: [] };
const products = new Map([buckfast, carnica].map((product) => [product.id, product]));
const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

test("prix du palier selon la quantité", () => {
  assert.equal(tierUnitPriceCents(buckfast, 1), 16000);
  assert.equal(tierUnitPriceCents(buckfast, 5), 15500);
  assert.equal(tierUnitPriceCents(buckfast, 12), 15000);
  assert.equal(tierUnitPriceCents(carnica, 30), 16500);
  assert.equal(centsToInput(15550), "155,50");
  assert.equal(centsToInput(15500), "155");
});

test("lignes saisies : totaux, noms du catalogue, charge utile", () => {
  const parsed = parseLines(JSON.stringify([{ productId: "p1", quantity: 6, unitPrice: "155" }, { productId: "p2", quantity: 2, unitPrice: "160,50" }]), products);
  assert.ok(parsed.ok);
  assert.equal(parsed.subtotalCents, 6 * 15500 + 2 * 16050);
  assert.equal(parsed.lines[1].name, "Essaim Carnica");
  assert.deepEqual(linesPayload(parsed.lines)[1], { product_id: "p2", quantity: 2, unit_price: "160.50" });
  // Prix vide : 0 (à confirmer), accepté
  const free = parseLines(JSON.stringify([{ productId: "p2", quantity: 1, unitPrice: "" }]), products);
  assert.ok(free.ok && free.subtotalCents === 0);
});

test("lignes refusées : vide, inconnue, doublon, quantité, prix", () => {
  const error = (raw: unknown) => {
    const parsed = parseLines(raw, products);
    return parsed.ok ? "" : parsed.error;
  };
  assert.match(error("[]"), /au moins un produit/);
  assert.match(error("pas du json"), /au moins un produit/);
  assert.match(error(JSON.stringify([{ productId: "p9", quantity: 1, unitPrice: "1" }])), /n’existe plus/);
  assert.match(error(JSON.stringify([{ productId: "p1", quantity: 1, unitPrice: "1" }, { productId: "p1", quantity: 2, unitPrice: "1" }])), /deux fois/);
  assert.match(error(JSON.stringify([{ productId: "p1", quantity: 0, unitPrice: "1" }])), /Quantité invalide/);
  assert.match(error(JSON.stringify([{ productId: "p1", quantity: 1.5, unitPrice: "1" }])), /Quantité invalide/);
  assert.match(error(JSON.stringify([{ productId: "p1", quantity: 1, unitPrice: "-3" }])), /Prix invalide/);
  assert.match(error(JSON.stringify([{ productId: "p1", quantity: 1, unitPrice: "100000" }])), /Prix invalide/);
});

test("proposition : retrait, livraison seulement avec une adresse, date à venir", () => {
  const ok = parseProposal(form({ deliveryMethod: "delivery", deliveryFee: "35,50", requestedDate: "2027-05-02", message: "Je vous propose" }), "2026-10-15", { canDeliver: true });
  assert.deepEqual(ok, { ok: true, value: { deliveryMethod: "delivery", deliveryFeeCents: 3550, requestedDate: "2027-05-02", message: "Je vous propose" } });
  const pickup = parseProposal(form({ deliveryMethod: "pickup", deliveryFee: "35" }), "2026-10-15", { canDeliver: true });
  assert.ok(pickup.ok && pickup.value.deliveryFeeCents === 0, "pas de frais pour un retrait");
  const noAddress = parseProposal(form({ deliveryMethod: "delivery" }), "2026-10-15", { canDeliver: false });
  assert.ok(!noAddress.ok && noAddress.errors.deliveryMethod);
  const past = parseProposal(form({ deliveryMethod: "pickup", requestedDate: "2026-10-01" }), "2026-10-15", { canDeliver: false });
  assert.ok(!past.ok && /à venir/.test(past.errors.requestedDate));
});

test("vente manuelle : client de passage, payée, déjà remise", () => {
  const sale = parseManualSale(form({ name: "  Client   du marché ", paid: "on", paymentMethod: "Espèces", step: "delivered", requestedDate: "2027-01-01" }), "2026-10-15");
  assert.ok(sale.ok);
  assert.equal(sale.value.name, "Client du marché");
  assert.equal(sale.value.email, "");
  assert.equal(sale.value.paymentMethod, "Espèces");
  assert.equal(sale.value.requestedDate, "", "pas de date pour une vente déjà remise");
  const unpaid = parseManualSale(form({ name: "Paul", paymentMethod: "Espèces", step: "ready" }), "2026-10-15");
  assert.ok(unpaid.ok && unpaid.value.paid === false && unpaid.value.paymentMethod === "");
});

test("vente manuelle refusée : nom, email, adresse de livraison", () => {
  const sale = parseManualSale(form({ name: "P", email: "pas-un-email", professionalId: "<siret>", deliveryMethod: "delivery", postalCode: "140" }), "2026-10-15");
  assert.ok(!sale.ok);
  assert.deepEqual(Object.keys(sale.errors).sort(), ["addressLine1", "city", "email", "name", "postalCode", "professionalId"]);
  const pro = parseManualSale(form({ name: "GAEC des Prés", professionalId: "FR 123 456 789" }), "2026-10-15");
  assert.ok(pro.ok && pro.value.professionalId === "FR 123 456 789");
});

test("montant d'une ligne en cours de saisie", async () => {
  const { draftLineCents } = await import("./admin-lines.ts");
  assert.equal(draftLineCents({ quantity: 3, unitPrice: "155,50" }), 46650);
  assert.equal(draftLineCents({ quantity: 2, unitPrice: "" }), 0);
  assert.equal(draftLineCents({ quantity: 2, unitPrice: "abc" }), null);
  assert.equal(draftLineCents({ quantity: 0, unitPrice: "10" }), null);
});
