import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "./origin";
import { clientIpFrom, rateLimitKey } from "./rate-limit-key";

export class ForbiddenOriginError extends Error {
  constructor() {
    super("Requête refusée : origine non autorisée.");
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Trop de tentatives. Patientez quelques minutes avant de réessayer.");
  }
}

// À appeler en tête de chaque Route Handler qui modifie des données. Les
// Server Actions n'en ont pas besoin : Next.js fait déjà ce contrôle.
export function assertSameOriginRequest(request: Request) {
  const ok = isSameOrigin({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  });
  if (!ok) throw new ForbiddenOriginError();
}

export async function currentClientIp() {
  return clientIpFrom(await headers());
}

/**
 * Consomme une unité du quota `scope` pour `identifier` (IP, email…).
 * Lève RateLimitError si la limite est atteinte sur la fenêtre.
 */
export async function enforceRateLimit(options: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const secret =
    process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Limitation de débit non configurée : renseignez RATE_LIMIT_SECRET.",
    );
  }

  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: rateLimitKey(secret, options.scope, options.identifier),
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    throw new Error(`Limitation de débit indisponible: ${error.message}`);
  }
  if (data !== true) throw new RateLimitError();
}
