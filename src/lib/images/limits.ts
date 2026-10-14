// Limites des photos produit, partagées entre le serveur (contrôle et
// réencodage) et le formulaire d'envoi (vérification avant l'envoi).
export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Photos jointes à une demande (formulaire de contact, CAHIER §12.1). Le
// navigateur les réduit avant l'envoi ; le serveur contrôle à nouveau.
export const MAX_REQUEST_PHOTOS = 3;
export const MAX_REQUEST_PHOTO_BYTES = 5 * 1024 * 1024;
