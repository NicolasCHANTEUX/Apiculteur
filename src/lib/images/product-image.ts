import "server-only";

import sharp, { type Metadata } from "sharp";

export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export class ImageRejectedError extends Error {}

/**
 * Décode et réencode une photo envoyée par l'admin : orientation EXIF
 * appliquée, 2 000 px au plus, WebP. Les métadonnées (EXIF, position GPS)
 * ne sont pas recopiées. Les images animées sont refusées.
 */
export async function normalizeProductImage(input: Buffer, extraRotation = 0) {
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError("Chaque photo doit faire 8 Mo au maximum.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new ImageRejectedError("Fichier illisible : envoyez une photo JPG, PNG ou WebP.");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ImageRejectedError("Format non pris en charge : JPG, PNG ou WebP uniquement.");
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new ImageRejectedError("Les images animées ne sont pas acceptées.");
  }

  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000 })
    .autoOrient()
    .rotate(extraRotation)
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}
