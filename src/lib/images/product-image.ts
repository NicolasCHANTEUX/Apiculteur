import "server-only";

import sharp, { type Metadata } from "sharp";
import { MAX_REQUEST_PHOTO_BYTES, MAX_UPLOAD_BYTES } from "@/lib/images/limits";

export { MAX_IMAGES_PER_PRODUCT, MAX_UPLOAD_BYTES } from "@/lib/images/limits";

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
  return normalize(input, { maxSide: 2000, quality: 82, extraRotation });
}

/**
 * Photo jointe à une demande par un visiteur : mêmes contrôles, 1 600 px
 * au plus. La position GPS de la photo n'est jamais conservée.
 */
export async function normalizeRequestPhoto(input: Buffer) {
  if (input.byteLength > MAX_REQUEST_PHOTO_BYTES) {
    throw new ImageRejectedError("Chaque photo doit faire 5 Mo au maximum.");
  }
  return normalize(input, { maxSide: 1600, quality: 80, extraRotation: 0 });
}

async function normalize(input: Buffer, { maxSide, quality, extraRotation }: { maxSide: number; quality: number; extraRotation: number }) {
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
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}
