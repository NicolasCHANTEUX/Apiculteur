import assert from "node:assert/strict";
import test from "node:test";
import { faq, faqThemes, highlightParts, searchFaq } from "./faq.ts";

test("ancres uniques et thèmes connus", () => {
  assert.equal(new Set(faq.map((item) => item.id)).size, faq.length);
  assert.ok(faq.every((item) => item.theme in faqThemes && /^[a-z0-9-]+$/.test(item.id)));
});

test("recherche sans accents, sur la question et la réponse, tous les mots", () => {
  assert.deepEqual(searchFaq(faq, "livraison frais").map((item) => item.id), ["frais-de-livraison"]);
  assert.ok(searchFaq(faq, "FACTURE").some((item) => item.id === "facture"));
  assert.ok(searchFaq(faq, "reserver").some((item) => item.id === "reserver-un-essaim"));
  assert.equal(searchFaq(faq, "  ").length, faq.length);
  assert.equal(searchFaq(faq, "kangourou").length, 0);
});

test("surlignage insensible aux accents, texte d'origine conservé", () => {
  const parts = highlightParts("Quand réserver ?", "reserver");
  assert.deepEqual(parts, [
    { text: "Quand ", match: false },
    { text: "réserver", match: true },
    { text: " ?", match: false },
  ]);
  assert.equal(parts.map((part) => part.text).join(""), "Quand réserver ?");
  assert.deepEqual(highlightParts("Livraison", ""), [{ text: "Livraison", match: false }]);
});
