// Limites des photos produit, partagées entre le serveur (contrôle et
// réencodage) et le formulaire d'envoi (vérification avant l'envoi).
export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
