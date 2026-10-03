import assert from "node:assert/strict";
import test from "node:test";
import { isSameOrigin } from "./origin.ts";
import { clientIpFrom, rateLimitKey } from "./rate-limit-key.ts";

test("accepte une requête de la même origine", () => {
  assert.equal(
    isSameOrigin({ origin: "https://ruchers.fr", host: "ruchers.fr" }),
    true,
  );
  assert.equal(
    isSameOrigin({ origin: "http://localhost:3000", host: "localhost:3000" }),
    true,
  );
});

test("utilise l'hôte transmis par le proxy", () => {
  assert.equal(
    isSameOrigin({
      origin: "https://ruchers.fr",
      host: "interne.vercel.app",
      forwardedHost: "ruchers.fr",
    }),
    true,
  );
});

test("refuse une origine absente, étrangère ou invalide", () => {
  assert.equal(isSameOrigin({ origin: null, host: "ruchers.fr" }), false);
  assert.equal(
    isSameOrigin({ origin: "https://attaquant.fr", host: "ruchers.fr" }),
    false,
  );
  assert.equal(
    isSameOrigin({ origin: "https://ruchers.fr:8443", host: "ruchers.fr" }),
    false,
  );
  assert.equal(isSameOrigin({ origin: "null", host: "ruchers.fr" }), false);
  assert.equal(
    isSameOrigin({ origin: "https://ruchers.fr", host: null }),
    false,
  );
});

test("la clé de limitation est stable, normalisée et dépend du secret", () => {
  const a = rateLimitKey("secret", "login", "Marc@Example.fr ");
  assert.equal(a, rateLimitKey("secret", "login", "marc@example.fr"));
  assert.notEqual(a, rateLimitKey("autre", "login", "marc@example.fr"));
  assert.notEqual(a, rateLimitKey("secret", "contact", "marc@example.fr"));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.throws(() => rateLimitKey("", "login", "x"));
});

test("IP du client depuis les en-têtes du proxy", () => {
  assert.equal(
    clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.1" })),
    "203.0.113.4",
  );
  assert.equal(
    clientIpFrom(new Headers({ "x-real-ip": "198.51.100.2" })),
    "198.51.100.2",
  );
  assert.equal(clientIpFrom(new Headers()), "unknown");
});
