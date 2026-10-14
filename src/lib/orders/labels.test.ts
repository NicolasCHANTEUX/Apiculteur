import assert from "node:assert/strict";
import test from "node:test";
import { orderState } from "./labels.ts";

test("état lisible d'une commande", () => {
  assert.equal(orderState("pending", "pending").label, "À valider");
  assert.equal(orderState("accepted", "preparing").key, "preparing");
  assert.equal(orderState("not_required", "pending").key, "preparing");
  assert.equal(orderState("accepted", "ready").label, "Prête");
  assert.equal(orderState("accepted", "delivered").label, "Terminée");
  assert.equal(orderState("refused", "cancelled").label, "Refusée");
  assert.equal(orderState("accepted", "cancelled").label, "Annulée");
});
