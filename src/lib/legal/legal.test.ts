import assert from "node:assert/strict";
import test from "node:test";
import { checkLegalConfig, defaultLegalConfig, isPlaceholderValue, isValidSiret, normalizeLegalConfig, parseLegalForm, type LegalConfig } from "./config.ts";
import { conditionsGenerales, mentionsLegales, politiqueConfidentialite, versionLine } from "./documents.ts";

// SIRET d’exemple public, à clé valide (algorithme de Luhn).
const SIRET = "73282932000074";

const complete: LegalConfig = {
  ...defaultLegalConfig,
  businessName: "EARL du Rucher",
  legalForm: "EARL",
  ownerName: "Jeanne Martin",
  addressLine: "4 chemin des Abeilles",
  postalCode: "14100",
  city: "Lisieux",
  siret: SIRET,
  email: "contact@rucher-martin.fr",
  phone: "02 31 00 00 01",
  publicationDirector: "Jeanne Martin",
  dataHost: "Supabase Inc., base de données hébergée en Union européenne (Francfort).",
  mediatorName: "Médiateur des Apiculteurs",
  mediatorWebsite: "https://mediateur.test",
  withdrawalTerms: "Texte validé de rétractation.",
  warrantyTerms: "Texte validé des garanties.",
  reservationTerms: "Texte validé des réservations.",
};

const context = { siteName: "Rucher", siteUrl: "https://rucher.test", version: 2, approvedAt: "2026-10-14T10:00:00Z", emailProvider: "Brevo" };

test("SIRET : contrôle de clé", () => {
  assert.ok(isValidSiret(SIRET));
  assert.ok(isValidSiret("732 829 320 00074"));
  assert.ok(!isValidSiret("73282932000075"));
  assert.ok(!isValidSiret("1234"));
});

test("valeurs provisoires détectées", () => {
  for (const value of ["Marc Dupont", "contact@ruchers-normandie.fr", "06 12 34 56 78", "[À faire valider] texte", "région à vérifier", "XXX", "jean@example.com"]) {
    assert.ok(isPlaceholderValue(value), value);
  }
  for (const value of ["", "Jeanne Martin", "EARL du Rucher", "02 31 00 00 01"]) assert.ok(!isPlaceholderValue(value), value);
});

test("configuration par défaut : incomplète, textes à valider signalés", () => {
  const check = checkLegalConfig(defaultLegalConfig);
  assert.ok(!check.ready);
  assert.ok(check.missing.includes("siret") && check.missing.includes("mediatorName"));
  assert.deepEqual(check.placeholders.sort(), ["dataHost", "reservationTerms", "warrantyTerms", "withdrawalTerms"]);
});

test("configuration complète : prête ; erreurs de format signalées", () => {
  assert.deepEqual(checkLegalConfig(complete), { missing: [], placeholders: [], invalid: {}, ready: true });
  const wrong = checkLegalConfig({ ...complete, siret: "12345678901234", postalCode: "141", mediatorWebsite: "mediateur.fr", vatMode: "assujetti", vatNumber: "" });
  assert.ok(!wrong.ready);
  assert.deepEqual(wrong.missing, ["vatNumber"]);
  assert.deepEqual(Object.keys(wrong.invalid).sort(), ["mediatorWebsite", "postalCode", "siret"]);
});

test("formulaire et configuration enregistrée", () => {
  const values: Record<string, string> = { businessName: "  EARL du Rucher ", vatMode: "assujetti", trashDays: "500", emailLogMonths: "abc" };
  const parsed = parseLegalForm({ get: (name) => values[name] ?? null });
  assert.equal(parsed.businessName, "EARL du Rucher");
  assert.equal(parsed.vatMode, "assujetti");
  assert.equal(parsed.trashDays, 90);
  assert.equal(parsed.emailLogMonths, 12);
  assert.equal(normalizeLegalConfig({ city: "Caen", trashDays: 10, inconnu: "x" }).city, "Caen");
  assert.equal(normalizeLegalConfig(null).hostName, "Vercel Inc.");
});

test("documents générés depuis la configuration", () => {
  const mentions = mentionsLegales(complete, context);
  const editor = mentions.sections[0].paragraphs.join(" ");
  assert.ok(editor.startsWith("EARL du Rucher, EARL, représentée par Jeanne Martin."));
  assert.ok(editor.includes(`SIRET : ${SIRET}.`));
  assert.ok(editor.includes("TVA non applicable, article 293 B"));
  assert.ok(mentionsLegales({ ...complete, legalForm: "Entreprise individuelle" }, context).sections[0].paragraphs[0].includes("entreprise individuelle de Jeanne Martin"));

  const cgv = conditionsGenerales({ ...complete, vatMode: "assujetti", vatNumber: "FR12345678901" }, context);
  assert.ok(cgv.sections.find((section) => section.heading === "3. Prix")?.paragraphs[0].includes("toutes taxes comprises"));
  assert.deepEqual(cgv.sections.find((section) => section.heading === "6. Droit de rétractation")?.paragraphs, ["Texte validé de rétractation."]);
  assert.ok(cgv.sections.at(-1)?.paragraphs[0].includes("Médiateur des Apiculteurs"));

  const privacy = politiqueConfidentialite(complete, context);
  assert.ok(privacy.sections.find((section) => section.heading === "Destinataires")?.list?.some((item) => item.startsWith("Brevo")));
  assert.ok(privacy.sections.find((section) => section.heading === "Durées de conservation")?.list?.[1].includes("36 mois"));
  assert.equal(versionLine(context), "Version 2, en vigueur depuis le 14 octobre 2026.");
});
