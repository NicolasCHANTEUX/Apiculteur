import assert from "node:assert/strict";
import test from "node:test";
import { customerEmailDraft, mailtoHref } from "./messages.ts";

test("brouillon selon l'état, avec les produits", () => {
  const draft = customerEmailDraft({
    number: "CMD-000012",
    customerName: "Claire Martin",
    state: "preparing",
    lines: [{ name: "Essaim Buckfast", quantity: 3 }],
    signature: "Marc",
  });
  assert.equal(draft.subject, "Votre demande est acceptée — CMD-000012");
  assert.match(draft.body, /^Bonjour Claire Martin,/);
  assert.match(draft.body, /- 3 × Essaim Buckfast/);
  assert.match(draft.body, /Marc$/);
});

test("lien mailto encodé", () => {
  assert.equal(mailtoHref("a@b.test", { subject: "Ça & là", body: "L1\nL2" }), "mailto:a@b.test?subject=%C3%87a%20%26%20l%C3%A0&body=L1%0AL2");
});
