import assert from "node:assert/strict";
import test from "node:test";
import { isSameOrigin } from "./origin.ts";
import { clientIpFrom, rateLimitKey, rateLimitSecret } from "./rate-limit-key.ts";
import { configuredSiteOrigin } from "./site-origin.ts";

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
    clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.1" }), { trustedHops: 2 }),
    "203.0.113.4",
  );
  // Hors Vercel, l'adresse ajoutée par le proxy (en fin) : une fausse
  // adresse placée en tête par le client est ignorée.
  assert.equal(clientIpFrom(new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" })), "198.51.100.7");
  assert.equal(clientIpFrom(new Headers({ "x-forwarded-for": "198.51.100.7" }), { trustedHops: 3 }), "198.51.100.7");
  // Sur Vercel, l'en-tête de la plateforme.
  assert.equal(
    clientIpFrom(new Headers({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.2.3.4" }), { vercel: true }),
    "203.0.113.9",
  );
  assert.equal(
    clientIpFrom(new Headers({ "x-real-ip": "198.51.100.2" })),
    "198.51.100.2",
  );
  assert.equal(clientIpFrom(new Headers()), "unknown");
});

test("secret de limitation : dédié, sinon dérivé (jamais la clé serveur elle-même)", () => {
  assert.equal(rateLimitSecret({ RATE_LIMIT_SECRET: "dedie", SUPABASE_SERVICE_ROLE_KEY: "cle" }), "dedie");
  const derived = rateLimitSecret({ SUPABASE_SERVICE_ROLE_KEY: "cle-serveur" });
  assert.match(derived ?? "", /^[0-9a-f]{64}$/);
  assert.notEqual(derived, "cle-serveur");
  assert.equal(rateLimitSecret({}), null);
});

test("adresse du site : https en production, jamais les en-têtes", () => {
  const production = { NODE_ENV: "production" };
  assert.equal(configuredSiteOrigin({ ...production, NEXT_PUBLIC_SITE_URL: "https://ruchers.fr/chemin" }), "https://ruchers.fr");
  assert.equal(configuredSiteOrigin({ ...production, NEXT_PUBLIC_SITE_URL: "http://ruchers.fr" }), null);
  assert.equal(configuredSiteOrigin({ ...production, NEXT_PUBLIC_SITE_URL: "http://localhost:3200" }), "http://localhost:3200");
  assert.equal(configuredSiteOrigin({ ...production, NEXT_PUBLIC_SITE_URL: "pas une adresse" }), null);
  assert.equal(configuredSiteOrigin({ ...production, VERCEL_PROJECT_PRODUCTION_URL: "ruchers.vercel.app" }), "https://ruchers.vercel.app");
  assert.equal(configuredSiteOrigin({ ...production, VERCEL_PROJECT_PRODUCTION_URL: "evil.fr/x" }), null);
  assert.equal(configuredSiteOrigin({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://192.168.1.5:3000" }), "http://192.168.1.5:3000");
  assert.equal(configuredSiteOrigin({ NODE_ENV: "development" }), null);
});

test("CSP : scripts au nonce, sans 'unsafe-inline'", async () => {
  const { buildContentSecurityPolicy, createNonce, supabaseOrigin } = await import("./csp.ts");
  const nonce = createNonce();
  assert.notEqual(nonce, createNonce(), "un nonce par requête");
  const production = buildContentSecurityPolicy({ nonce, dev: false, supabase: supabaseOrigin("https://abc.supabase.co/rest") });
  const scripts = production.split("; ").find((part) => part.startsWith("script-src")) ?? "";
  assert.equal(scripts, `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
  assert.match(production, /connect-src 'self' https:\/\/abc\.supabase\.co;/);
  assert.match(production, /upgrade-insecure-requests$/);
  assert.match(buildContentSecurityPolicy({ nonce, dev: true, supabase: "x" }), /'unsafe-eval'/);
  assert.equal(supabaseOrigin(undefined), "https://*.supabase.co");
});
