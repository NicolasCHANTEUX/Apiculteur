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
  renderReviewEmail,
  type ReviewEmailContext,
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
  deliveryFeeCents: 0,
  pickupAddress: { public: null, afterAcceptance: "4 chemin des Abeilles, 14100 Lisieux" },
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

test("livraison et adresse de retrait dans le récapitulatif", () => {
  const delivery = { ...order, deliveryMethod: "delivery" as const, address: "3 rue des Lilas\n14000 Caen", deliveryFeeCents: 4500, totalCents: 40500 };
  assert.match(renderOrderEmail("order_received", delivery, identity).text, /- Livraison : 45,00 €\nTotal : 405,00 €/);
  assert.match(renderOrderEmail("order_received", { ...delivery, deliveryFeeCents: 0 }, identity).text, /- Livraison : à convenir/);
  assert.match(renderOrderEmail("order_shipped", delivery, identity).subject, /est en route/);
  // Adresse de retrait non publique : seulement après acceptation.
  assert.doesNotMatch(renderOrderEmail("order_received", order, identity).text, /Adresse de retrait/);
  assert.match(renderOrderEmail("order_accepted", order, identity).text, /Adresse de retrait : 4 chemin des Abeilles, 14100 Lisieux/);
  assert.match(renderOrderEmail("order_ready", order, identity).text, /Adresse de retrait/);
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

const review: ReviewEmailContext = {
  orderId: "33333333-3333-4333-8333-333333333333",
  orderNumber: "CMD-000050",
  customerName: "Léa Petit",
  productNames: ["Essaim Buckfast"],
  link: "https://ruchers.test/mon-avis/abc",
  linkDays: 30,
  rating: 4,
  comment: "Essaim <très> doux.",
  displayName: "Léa P.",
  consent: true,
};

test("avis : demande, alerte et remerciement", () => {
  const request = renderReviewEmail("review_request", review, identity);
  assert.equal(request.subject, "Votre avis sur Essaim Buckfast");
  assert.ok(request.text.includes("Donner mon avis : https://ruchers.test/mon-avis/abc"));
  assert.ok(request.text.includes("valable 30 jours"));
  const alert = renderReviewEmail("review_new_admin", review, identity);
  assert.equal(alert.subject, "Nouvel avis ★★★★☆ — Léa P. (CMD-000050)");
  assert.doesNotMatch(alert.html, /<très>/);
  assert.ok(alert.text.includes("Modérer l’avis : https://ruchers.test/admin/avis"));
  assert.ok(renderReviewEmail("review_thanks", review, identity).text.includes("publié sur le site après relecture"));
  assert.ok(renderReviewEmail("review_thanks", { ...review, consent: false }, identity).text.includes("il ne sera pas publié"));
});


test("proposition : lignes proposées, lien personnel, message de l'apiculteur", () => {
  const email = renderOrderEmail("order_proposal", { ...order, note: "Je n’en ai que 6 en avril.", link: "https://ruchers.test/proposition/xyz", linkDays: 14 }, identity);
  assert.equal(email.subject, "Une proposition pour votre demande CMD-000042");
  assert.ok(email.text.includes("Ma proposition · demande CMD-000042"));
  assert.ok(email.text.includes("Voir la proposition et répondre : https://ruchers.test/proposition/xyz"));
  assert.ok(email.text.includes("valable 14 jours"));
  assert.ok(email.text.includes("Je n’en ai que 6 en avril."));
  const withoutLink = renderOrderEmail("order_proposal", order, identity);
  assert.ok(withoutLink.text.includes("en répondant à cet email"));
});

test("réponse à une proposition : alerte selon l'issue, message du client", () => {
  const accepted = renderOrderEmail("order_proposal_admin", { ...order, proposalOutcome: "accepted" }, identity);
  assert.equal(accepted.subject, "Proposition acceptée — CMD-000042");
  assert.ok(accepted.text.includes("Voir la commande : https://ruchers.test/admin/commandes/"));
  const declined = renderOrderEmail("order_proposal_admin", { ...order, proposalOutcome: "declined", proposalReply: "Il me faut <10> essaims." }, identity);
  assert.equal(declined.subject, "Proposition déclinée — CMD-000042");
  assert.ok(declined.text.includes("Il me faut <10> essaims."));
  assert.doesNotMatch(declined.html, /<10>/);
  assert.match(renderOrderEmail("order_proposal_admin", { ...order, proposalOutcome: "accepted_stock_short" }, identity).subject, /stock à vérifier/);
});

test("récapitulatif de vente manuelle : remise ou à retirer, règlement", () => {
  const delivered = renderOrderEmail("order_confirmed", { ...order, fulfillmentStatus: "delivered", paid: true, paymentMethod: "Espèces" }, identity);
  assert.equal(delivered.subject, "Merci pour votre achat — CMD-000042");
  assert.ok(delivered.text.includes("Règlement reçu (espèces)"));
  assert.ok(!delivered.text.includes("Date souhaitée"), "pas de réception pour une vente déjà remise");
  const toCollect = renderOrderEmail("order_confirmed", { ...order, fulfillmentStatus: "ready" }, identity);
  assert.equal(toCollect.subject, "Votre commande CMD-000042 est confirmée");
  assert.ok(toCollect.text.includes("4 chemin des Abeilles"), "adresse de retrait communiquée");
});
