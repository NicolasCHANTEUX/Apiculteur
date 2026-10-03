import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidEmail,
  normalizeEmail,
  sanitizeRedirectPath,
  validateNewPassword,
} from "./validation.ts";

test("normalise et valide les emails", () => {
  assert.equal(normalizeEmail("  Marc@Ruchers.FR "), "marc@ruchers.fr");
  assert.equal(normalizeEmail(null), "");
  assert.equal(isValidEmail("marc@ruchers.fr"), true);
  assert.equal(isValidEmail("marc@ruchers"), false);
  assert.equal(isValidEmail("marc ruchers@x.fr"), false);
  assert.equal(isValidEmail(""), false);
});

test("redirection limitée aux chemins internes", () => {
  assert.equal(sanitizeRedirectPath("/admin/commandes", "/admin"), "/admin/commandes");
  assert.equal(sanitizeRedirectPath("/admin?x=1", "/admin"), "/admin?x=1");
  for (const bad of [
    "https://evil.fr",
    "//evil.fr",
    "/\\evil.fr",
    "admin",
    "",
    "/admin\n",
    undefined,
    42,
  ]) {
    assert.equal(sanitizeRedirectPath(bad, "/admin"), "/admin", String(bad));
  }
});

test("politique de nouveau mot de passe", () => {
  assert.equal(validateNewPassword("correct-horse-1", "correct-horse-1"), null);
  assert.match(validateNewPassword("court", "court") ?? "", /au moins 10/);
  assert.match(
    validateNewPassword("correct-horse-1", "correct-horse-2") ?? "",
    /ne correspondent pas/,
  );
  assert.match(validateNewPassword(" espace-devant", " espace-devant") ?? "", /espace/);
  assert.match(validateNewPassword("é".repeat(40), "é".repeat(40)) ?? "", /trop long/);
  assert.notEqual(validateNewPassword(undefined, "x"), null);
});
