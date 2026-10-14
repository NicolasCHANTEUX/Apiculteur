import assert from "node:assert/strict";
import test from "node:test";
import { defaultDisplayName, parseReviewDelay, parseReviewForm } from "./form.ts";
import { createReviewToken, hashReviewToken, isReviewTokenShape } from "./token.ts";

const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

test("jeton : aléatoire, empreinte stable, forme vérifiée", () => {
  const a = createReviewToken();
  const b = createReviewToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isReviewTokenShape(a.token));
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.equal(hashReviewToken(a.token), a.hash);
  assert.ok(!isReviewTokenShape("court"));
  assert.ok(!isReviewTokenShape(`${a.token.slice(0, 42)}/`));
});

test("nom affiché par défaut : prénom et initiale", () => {
  assert.equal(defaultDisplayName("Claire Martin"), "Claire M.");
  assert.equal(defaultDisplayName("  jean   de la fontaine "), "jean F.");
  assert.equal(defaultDisplayName("GAEC"), "GAEC");
  assert.equal(defaultDisplayName(""), "");
});

test("formulaire d'avis", () => {
  const ok = parseReviewForm(form({ rating: "4", comment: " Très bien.\r\nMerci ", displayName: " Claire  M. ", consent: "on" }));
  assert.deepEqual(ok, { ok: true, value: { rating: 4, comment: "Très bien.\nMerci", displayName: "Claire M.", consent: true } });
  const noConsent = parseReviewForm(form({ rating: "5", displayName: "Paul L." }));
  assert.ok(noConsent.ok && noConsent.value.consent === false && noConsent.value.comment === "");
  const bad = parseReviewForm(form({ rating: "6", displayName: "P", comment: "x".repeat(2001) }));
  assert.ok(!bad.ok);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["comment", "displayName", "rating"]);
});

test("délai de demande d'avis", () => {
  assert.equal(parseReviewDelay("14"), 14);
  assert.equal(parseReviewDelay(0), 0);
  assert.equal(parseReviewDelay("abc"), 7);
  assert.equal(parseReviewDelay(400), 7);
});
