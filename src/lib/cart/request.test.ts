import assert from "node:assert/strict";
import test from "node:test";
import { cartRequestMessage, contactHref, productQuestionMessage } from "./request.ts";

// Intl insère des espaces insécables (U+00A0, U+202F) dans les montants.
const nbsp = (text: string) => text.replace(/[  ]/g, " ");

test("message de demande depuis le panier, avec total estimé", () => {
  const message = nbsp(
    cartRequestMessage([
      { name: "Essaim Buckfast", sku: "ESS-5", quantity: 3, unitPriceCents: 18_000 },
      { name: "Reine", sku: null, quantity: 1, unitPriceCents: null },
    ]),
  );
  assert.match(message, /- 3 × Essaim Buckfast \(réf\. ESS-5\) : 180,00 € l’unité, soit 540,00 €/);
  assert.match(message, /- 1 × Reine : prix à confirmer/);
  assert.match(message, /Total estimé : 540,00 € \(hors produits à prix à confirmer\)/);
});

test("total à confirmer quand aucun prix n'est affiché", () => {
  assert.match(cartRequestMessage([{ name: "Réservation", sku: null, quantity: 2, unitPriceCents: null }]), /Total : à confirmer/);
});

test("question sur un produit et lien vers le contact", () => {
  assert.match(productQuestionMessage("Essaim", "ESS-5"), /« Essaim » \(réf\. ESS-5\)/);
  const href = contactHref("Question sur un essaim", "Bonjour & merci");
  assert.equal(href, "/contact?sujet=Question+sur+un+essaim&message=Bonjour+%26+merci");
});
