import assert from "node:assert/strict";
import test from "node:test";
import { describeAuditAction, formatRelativeTime } from "./audit-labels.ts";

test("actions produit traduites avec leurs détails", () => {
  assert.equal(describeAuditAction("product.status_changed", { status: "published" }), "Passé en « publié »");
  assert.equal(describeAuditAction("product.stock_updated", { stock_quantity: 0 }), "Stock mis à jour : 0");
  assert.equal(describeAuditAction("product.images_added", { count: 1 }), "1 photo ajoutée");
  assert.equal(describeAuditAction("product.images_added", { count: 3 }), "3 photos ajoutées");
});

test("métadonnées absentes ou inattendues : libellé générique", () => {
  assert.equal(describeAuditAction("product.status_changed", null), "Statut modifié");
  assert.equal(describeAuditAction("product.stock_updated", { stock_quantity: "12" }), "Stock mis à jour");
  assert.equal(describeAuditAction("order.unknown", null), "order.unknown");
});

test("commandes et réglages", () => {
  assert.equal(describeAuditAction("order.status_changed", { status: "ready" }), "Passée en « prête »");
  assert.equal(describeAuditAction("order.paid", { method: "Virement" }), "Paiement enregistré (Virement)");
  assert.equal(describeAuditAction("settings.orders_open", { open: true }), "Demandes en ligne ouvertes");
});

test("temps relatif en français", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  assert.equal(formatRelativeTime("2026-10-13T11:59:30Z", now), "à l’instant");
  assert.equal(formatRelativeTime("2026-10-13T11:55:00Z", now), "il y a 5 minutes");
  assert.equal(formatRelativeTime("2026-10-13T09:00:00Z", now), "il y a 3 heures");
  assert.equal(formatRelativeTime("2026-10-12T12:00:00Z", now), "hier");
  assert.equal(formatRelativeTime("2026-09-30T12:00:00Z", now), "30 sept.");
});
