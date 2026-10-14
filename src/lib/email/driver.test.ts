import assert from "node:assert/strict";
import test from "node:test";
import { EmailSendError, createEmailDriver, parseMailbox, readEmailConfig, type OutgoingEmail } from "./driver.ts";

const complete = {
  EMAIL_PROVIDER: "brevo",
  EMAIL_API_KEY: "cle-secrete",
  EMAIL_FROM: "Ruchers de Normandie <contact@ruchers.test>",
  EMAIL_REPLY_TO: "marc@ruchers.test",
  ADMIN_NOTIFICATION_EMAIL: "marc@ruchers.test",
};

const email: OutgoingEmail = {
  to: { email: "claire@exemple.test", name: "Claire Martin" },
  replyTo: "marc@ruchers.test",
  subject: "Sujet",
  html: "<p>Bonjour</p>",
  text: "Bonjour",
  idempotencyKey: "abc",
};

test("expéditeur avec ou sans nom", () => {
  assert.deepEqual(parseMailbox("Ruchers <a@b.test>"), { email: "a@b.test", name: "Ruchers" });
  assert.deepEqual(parseMailbox('"Ruchers" <a@b.test>'), { email: "a@b.test", name: "Ruchers" });
  assert.deepEqual(parseMailbox(" a@b.test "), { email: "a@b.test", name: null });
  assert.equal(parseMailbox("pas une adresse"), null);
  assert.equal(parseMailbox(undefined), null);
});

test("configuration : fournisseur actif seulement si tout est rempli", () => {
  assert.equal(readEmailConfig(complete).provider, "brevo");
  assert.deepEqual(readEmailConfig(complete).problems, []);
  assert.equal(readEmailConfig({}).provider, null);
  assert.deepEqual(readEmailConfig({}).problems, []);
  const missing = readEmailConfig({ EMAIL_PROVIDER: "resend" });
  assert.equal(missing.provider, null);
  assert.deepEqual(missing.problems, ["EMAIL_API_KEY est vide.", "EMAIL_FROM est vide."]);
  assert.deepEqual(readEmailConfig({ EMAIL_PROVIDER: "sendgrid" }).problems, ["EMAIL_PROVIDER doit valoir « brevo » ou « resend »."]);
  assert.deepEqual(readEmailConfig({ ...complete, ADMIN_NOTIFICATION_EMAIL: "marc" }).problems, ["ADMIN_NOTIFICATION_EMAIL n’est pas une adresse valide."]);
});

test("Brevo : requête attendue", async () => {
  let call: { url: string; init: RequestInit } | undefined;
  const driver = createEmailDriver(readEmailConfig(complete), async (url, init) => {
    call = { url: String(url), init: init ?? {} };
    return Response.json({ messageId: "<id@brevo>" }, { status: 201 });
  });
  assert.ok(driver);
  assert.deepEqual(await driver.send(email), { messageId: "<id@brevo>" });
  assert.equal(call?.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal((call?.init.headers as Record<string, string>)["api-key"], "cle-secrete");
  const body = JSON.parse(String(call?.init.body));
  assert.deepEqual(body.sender, { email: "contact@ruchers.test", name: "Ruchers de Normandie" });
  assert.deepEqual(body.to, [{ email: "claire@exemple.test", name: "Claire Martin" }]);
  assert.deepEqual(body.replyTo, { email: "marc@ruchers.test" });
  assert.equal(body.htmlContent, "<p>Bonjour</p>");
  assert.equal(body.textContent, "Bonjour");
});

test("Resend : requête attendue, avec clé d'idempotence", async () => {
  let call: { url: string; init: RequestInit } | undefined;
  const driver = createEmailDriver(readEmailConfig({ ...complete, EMAIL_PROVIDER: "Resend" }), async (url, init) => {
    call = { url: String(url), init: init ?? {} };
    return Response.json({ id: "re_123" });
  });
  assert.deepEqual(await driver?.send(email), { messageId: "re_123" });
  assert.equal(call?.url, "https://api.resend.com/emails");
  const headers = call?.init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer cle-secrete");
  assert.equal(headers["idempotency-key"], "abc");
  const body = JSON.parse(String(call?.init.body));
  assert.equal(body.from, "Ruchers de Normandie <contact@ruchers.test>");
  assert.deepEqual(body.to, ["Claire Martin <claire@exemple.test>"]);
  assert.equal(body.reply_to, "marc@ruchers.test");
});

test("erreurs : définitives ou passagères, sans adresse dans le message", async () => {
  const failing = (status: number, body: unknown) =>
    createEmailDriver(readEmailConfig(complete), async () => Response.json(body, { status }));
  await assert.rejects(failing(400, { code: "invalid_parameter", message: "email claire@exemple.test is not valid" })!.send(email), (error) => {
    assert.ok(error instanceof EmailSendError);
    assert.equal(error.permanent, true);
    assert.equal(error.message, "Brevo HTTP 400 — invalid_parameter : email [adresse] is not valid");
    return true;
  });
  await assert.rejects(failing(503, {})!.send(email), (error) => error instanceof EmailSendError && !error.permanent);
  await assert.rejects(failing(429, {})!.send(email), (error) => error instanceof EmailSendError && !error.permanent);
  const offline = createEmailDriver(readEmailConfig(complete), async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(offline!.send(email), { message: "Brevo : service injoignable" });
});

test("sans fournisseur : aucun pilote", () => {
  assert.equal(createEmailDriver(readEmailConfig({})), null);
});
