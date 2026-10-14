// Jeton du lien de dépôt d'avis (CAHIER §13) : 32 octets aléatoires dans
// l'adresse, seule leur empreinte SHA-256 est enregistrée en base. Sans
// dépendance à Next (testable).

import { createHash, randomBytes } from "node:crypto";

const SHAPE = /^[A-Za-z0-9_-]{43}$/;

export function hashReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createReviewToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashReviewToken(token) };
}

/** Forme d'un jeton (avant toute lecture en base). */
export function isReviewTokenShape(value: string) {
  return SHAPE.test(value);
}

/** Durée de validité du lien. */
export const REVIEW_LINK_DAYS = 30;
