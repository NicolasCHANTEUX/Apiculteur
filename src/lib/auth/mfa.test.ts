import assert from "node:assert/strict";
import test from "node:test";
import { formatTotpSecret, mfaPath, needsSecondFactor, parseTotpCode } from "./mfa.ts";

test("code à usage unique : 6 chiffres, espaces et tirets tolérés", () => {
  assert.equal(parseTotpCode("123456"), "123456");
  assert.equal(parseTotpCode(" 123 456 "), "123456");
  assert.equal(parseTotpCode("123-456"), "123456");
  for (const bad of ["12345", "1234567", "12345a", "", null, 123456]) {
    assert.equal(parseTotpCode(bad), null, String(bad));
  }
});

test("pages de double authentification avec retour", () => {
  assert.equal(mfaPath("verify", "/admin/commandes"), "/connexion/verification?redirect=%2Fadmin%2Fcommandes");
  assert.equal(mfaPath("enroll", "/admin"), "/connexion/double-authentification?redirect=%2Fadmin");
});

test("changement de mot de passe : code exigé dès qu'une application est associée", () => {
  const verified = [{ status: "verified" }];
  assert.equal(needsSecondFactor(verified, "aal1"), true);
  assert.equal(needsSecondFactor(verified, undefined), true);
  assert.equal(needsSecondFactor(verified, "AAL2"), true);
  assert.equal(needsSecondFactor(verified, "aal2"), false);
  // Configuration commencée mais jamais confirmée, ou aucune : le lien suffit.
  assert.equal(needsSecondFactor([{ status: "unverified" }], "aal1"), false);
  assert.equal(needsSecondFactor([], "aal1"), false);
  assert.equal(needsSecondFactor(undefined, null), false);
});

test("secret affiché par groupes de 4", () => {
  assert.equal(formatTotpSecret("ABCDEFGHIJKLMNOP"), "ABCD EFGH IJKL MNOP");
  assert.equal(formatTotpSecret("ABCDEF"), "ABCD EF");
});
