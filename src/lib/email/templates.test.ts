import assert from "node:assert/strict";
import test from "node:test";
import {
  emailTemplates,
  escapeHtml,
  formatEuros,
  renderOrderEmail,
  renderRequestEmail,
  type OrderEmailContext,
  type OrderTemplate,
  type RequestEmailContext,
  type RequestTemplate,
} from "./templates.ts";

const identity = {
  siteName: "Ruchers de Normandie",
  ownerName: "Marc Dupont",
  ownerFirstName: "Marc",
  siteUrl: "https://ruchers.test",
  contactEmail: "contact@ruchers.test",
  phone: "06 12 34 56 78",
};

const order: OrderEmailContext = {
  id: "11111111-1111-4111-8111-111111111111",
  number: "CMD-000042",
  customerName: "Claire <Martin>",
  companyName: null,
  email: "claire@exemple.test",
  phone: "06 00 00 00 00",
  lines: [
    { name: "Essaim Buckfast", quantity: 2, unitPriceCents: 18000, lineTotalCents: 36000 },
    { name: "Reine fécondée", quantity: 1, unitPriceCents: 0, lineTotalCents: 0 },
  ],
  totalCents: 36000,
  deliveryMethod: "pickup",
  address: null,
  requestedDate: "2026-04-18",
  customerMessage: "Bonjour,\n<script>alert(1)</script>",
  note: null,
  paymentMethod: null,
  paid: false,
  reviewReasons: [],
};

test("chaque modèle produit un sujet, du HTML et du texte", () => {
  const keys = Object.keys(emailTemplates);
  for (const template of keys.filter((key) => key.startsWith("order_")) as OrderTemplate[]) {
    const email = renderOrderEmail(template, order, identity);
    assert.ok(email.subject.length > 0 && email.subject.length <= 200, template);
    assert.match(email.html, /^<!doctype html>/, template);
    assert.ok(email.text.length > 50, template);
  }
});

test("accusé de réception : récapitulatif, date et signature", () => {
  const email = renderOrderEmail("order_received", order, identity);
  assert.equal(email.subject, "Votre demande CMD-000042 est bien reçue");
  assert.match(email.text, /^Bonjour Claire <Martin>,/);
  assert.match(email.text, /- 2 × Essaim Buckfast : 360,00 €/);
  assert.match(email.text, /- 1 × Reine fécondée : prix à confirmer/);
  assert.match(email.text, /Date souhaitée : samedi 18 avril 2026/);
  assert.match(email.text, /Marc Dupont\nRuchers de Normandie/);
  assert.match(email.text, /> <script>alert\(1\)<\/script>/);
});

test("HTML : toutes les valeurs du client sont échappées", () => {
  const email = renderOrderEmail("order_received", order, identity);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html, /Bonjour Claire &lt;Martin&gt;,/);
  assert.equal(escapeHtml(`"a" & 'b'`), "&quot;a&quot; &amp; &#39;b&#39;");
});

test("alerte admin : lien vers la demande, pas de signature", () => {
  const email = renderOrderEmail("order_new_admin", { ...order, companyName: "GAEC du Bocage", reviewReasons: ["Grande quantité"] }, identity);
  assert.equal(email.subject, "Nouvelle demande CMD-000042 — Claire <Martin> (GAEC du Bocage)");
  assert.match(email.text, /Voir la demande : https:\/\/ruchers\.test\/admin\/commandes\/11111111-1111-4111-8111-111111111111/);
  assert.match(email.text, /À regarder de près : Grande quantité\./);
  assert.doesNotMatch(email.text, /Bien à vous/);
});

test("message de l'apiculteur repris dans l'email", () => {
  const accepted = renderOrderEmail("order_accepted", { ...order, note: "Retrait samedi matin" }, identity);
  assert.match(accepted.text, /Un mot de Marc\n> Retrait samedi matin/);
  const refused = renderOrderEmail("order_refused", { ...order, note: "Plus de disponibilité" }, identity);
  assert.match(refused.text, /Précision\n> Plus de disponibilité/);
  assert.doesNotMatch(renderOrderEmail("order_accepted", order, identity).text, /Un mot de/);
});

test("retrait ou livraison : textes adaptés", () => {
  const delivery = { ...order, deliveryMethod: "delivery" as const, address: "3 rue des Lilas\n14000 Caen" };
  assert.match(renderOrderEmail("order_ready", delivery, identity).text, /Je vous contacte pour fixer le moment de la livraison/);
  assert.match(renderOrderEmail("order_ready", order, identity).text, /venir la retirer/);
  assert.match(renderOrderEmail("order_received", delivery, identity).text, /Adresse : 3 rue des Lilas, 14000 Caen/);
});

test("paiement et annulation", () => {
  const paid = renderOrderEmail("order_paid", { ...order, paymentMethod: "Virement", paid: true }, identity);
  assert.match(paid.text, /règlement de 360,00 € \(virement\)/);
  assert.match(renderOrderEmail("order_cancelled", { ...order, paid: true }, identity).text, /vous sera remboursé/);
  assert.doesNotMatch(renderOrderEmail("order_cancelled", order, identity).text, /remboursé/);
});

test("montants en euros", () => {
  assert.equal(formatEuros(123456), "1 234,56 €");
});

const request: RequestEmailContext = {
  id: "22222222-2222-4222-8222-222222222222",
  reference: "DEM-000007",
  kindLabel: "Essaim",
  customerName: "Paul <Lefèvre>",
  email: "paul@exemple.test",
  phone: "06 00 00 00 00",
  subject: "Essaim à récupérer — Caen",
  message: "Un essaim dans le cerisier.\nIl est assez haut.",
  details: [["Lieu", "Caen"], ["Hauteur", "Plus de 3 mètres"]],
  productName: null,
  photoCount: 2,
  reply: null,
};
const replyText = "Bonjour Paul,\n\nJe passe demain matin.";

test("demandes : accusé de réception, alerte et réponse", () => {
  for (const template of ["request_received", "request_new_admin", "request_reply"] as RequestTemplate[]) {
    const email = renderRequestEmail(template, { ...request, reply: replyText }, identity);
    assert.doesNotMatch(email.html, /<Lefèvre>/, template);
  }
  const received = renderRequestEmail("request_received", request, identity);
  assert.equal(received.subject, "J’ai bien reçu votre message — DEM-000007");
  assert.match(received.text, /Merci de votre signalement/);
  assert.match(received.text, /Hauteur : Plus de 3 mètres/);
  assert.match(received.text, /2 photos jointes à votre message\./);
  const alert = renderRequestEmail("request_new_admin", request, identity);
  assert.equal(alert.subject, "Essaim signalé DEM-000007 — Paul <Lefèvre>");
  assert.match(alert.text, /Voir la demande : https:\/\/ruchers\.test\/admin\/demandes\/22222222/);
  const reply = renderRequestEmail("request_reply", { ...request, reply: replyText }, identity);
  assert.equal(reply.subject, "Re : Essaim à récupérer — Caen");
  assert.ok(reply.text.startsWith(replyText));
  assert.ok(reply.text.includes("Votre message (DEM-000007)\n> Un essaim dans le cerisier.\n> Il est assez haut."));
  assert.ok(reply.text.includes("Bien à vous,\nMarc Dupont"));
});

