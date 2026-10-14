import assert from "node:assert/strict";
import test from "node:test";
import { describeRequestDetails, kindFromParams, parseContactRequest } from "./form.ts";

const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
const base = {
  name: "  Claire   Martin ",
  email: "Claire@Example.TEST",
  message: "Bonjour, j’ai une question sur vos essaims.",
  consent: "on",
};

test("type depuis l'adresse ou l'ancien sujet", () => {
  assert.equal(kindFromParams("devis", ""), "quote");
  assert.equal(kindFromParams("essaim", ""), "swarm");
  assert.equal(kindFromParams("", "Grande quantité"), "quote");
  assert.equal(kindFromParams("n'importe", "Question sur un essaim"), "contact");
});

test("question : nettoyage et sujet connu", () => {
  const result = parseContactRequest(form({ ...base, kind: "contact", subject: "Livraison ou retrait" }));
  assert.ok(result.ok);
  assert.equal(result.value.name, "Claire Martin");
  assert.equal(result.value.email, "claire@example.test");
  assert.equal(result.value.subject, "Livraison ou retrait");
  assert.deepEqual(result.value.details, {});
  const unknown = parseContactRequest(form({ ...base, kind: "contact", subject: "<script>" }));
  assert.ok(unknown.ok && unknown.value.subject === "Autre demande");
});

test("champs obligatoires et consentement", () => {
  const result = parseContactRequest(form({ kind: "contact", name: "C", email: "pas-un-email", message: "trop court", phone: "abc" }));
  assert.ok(!result.ok);
  assert.deepEqual(Object.keys(result.errors).sort(), ["consent", "email", "message", "name", "phone"]);
});

test("devis : quantité obligatoire, sujet construit", () => {
  const missing = parseContactRequest(form({ ...base, kind: "quote" }));
  assert.ok(!missing.ok && missing.errors.quantity);
  const result = parseContactRequest(form({ ...base, kind: "quote", quantity: "25", variety: "Buckfast", period: "Avril 2027", company: "GAEC du Bocage" }));
  assert.ok(result.ok);
  assert.equal(result.value.subject, "Devis : 25 × Buckfast");
  assert.equal(result.value.details.quantity, 25);
  const fromProduct = parseContactRequest(form({ ...base, kind: "quote", quantity: "10" }), "Essaim noir local");
  assert.ok(fromProduct.ok && fromProduct.value.subject === "Devis : 10 × Essaim noir local");
  assert.ok(!parseContactRequest(form({ ...base, kind: "quote", quantity: "2.5" })).ok);
});

test("essaim : lieu et téléphone obligatoires, choix bornés", () => {
  const missing = parseContactRequest(form({ ...base, kind: "swarm" }));
  assert.ok(!missing.ok);
  assert.ok(missing.errors.location && missing.errors.phone);
  const result = parseContactRequest(form({ ...base, kind: "swarm", phone: "06 12 34 56 78", location: "12 rue des Lilas, Caen", height: "high", since: "piratage" }));
  assert.ok(result.ok);
  assert.equal(result.value.subject, "Essaim à récupérer — 12 rue des Lilas, Caen");
  assert.deepEqual(result.value.details, { location: "12 rue des Lilas, Caen", height: "high", since: "unknown" });
});

test("détails lisibles", () => {
  assert.deepEqual(describeRequestDetails("swarm", { location: "Caen", height: "high", since: "today" }), [
    ["Lieu", "Caen"],
    ["Hauteur", "Plus de 3 mètres"],
    ["Depuis", "Aujourd’hui"],
  ]);
  assert.deepEqual(describeRequestDetails("quote", { quantity: 25, variety: "", budget: "3 000 €" }), [
    ["Quantité", "25"],
    ["Budget indicatif", "3 000 €"],
  ]);
  assert.deepEqual(describeRequestDetails("contact", {}), []);
});
