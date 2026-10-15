// Jeton du lien de dépôt d'avis (CAHIER §13) : voir lib/security/link-token.

import { createLinkToken, hashLinkToken, isLinkTokenShape } from "../security/link-token.ts";

export const hashReviewToken = hashLinkToken;
export const createReviewToken = createLinkToken;
export const isReviewTokenShape = isLinkTokenShape;

/** Durée de validité du lien. */
export const REVIEW_LINK_DAYS = 30;
