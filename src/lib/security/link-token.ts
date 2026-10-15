// Jetons des liens personnels envoyés par email (dépôt d'avis, réponse à une
// proposition) : 32 octets aléatoires dans l'adresse, seule leur empreinte
// SHA-256 est enregistrée en base. Sans dépendance à Next (testable).

import { createHash, randomBytes } from "node:crypto";

const SHAPE = /^[A-Za-z0-9_-]{43}$/;

export function hashLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createLinkToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

/** Forme d'un jeton (avant toute lecture en base). */
export function isLinkTokenShape(value: string) {
  return SHAPE.test(value);
}
