import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// La politique de sécurité du contenu (CSP) part de src/proxy.ts, avec un
// nonce propre à chaque requête (src/lib/security/csp.ts) : plus de
// 'unsafe-inline' pour les scripts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Plus gros envois : une photo produit (8 Mo, envoyées une par une) et
      // les 3 photos d'une demande (5 Mo chacune au plus, réduites dans le
      // navigateur). Par défaut : 1 Mo. Revue de sécurité : 30 Mo → 16 Mo.
      bodySizeLimit: "16mb",
    },
    // Le proxy (proxy.ts, sur toutes les routes) garde en mémoire le corps
    // des requêtes, 10 Mo par défaut : au-delà, il serait tronqué. Même
    // plafond que les actions.
    proxyClientMaxBodySize: "16mb",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
