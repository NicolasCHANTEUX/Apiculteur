// Libellés français des valeurs produit (enums SQL), partagés entre
// l'administration et le site public.

export const productStatusLabels = {
  draft: "Brouillon",
  published: "Publié",
  hidden: "Masqué",
  sold_out: "Épuisé",
  archived: "Archivé",
} as const;

export const conditionLabels = {
  new: "Neuf",
  used: "Occasion",
  second_choice: "Second choix",
} as const;

export const deliveryModeLabels = {
  pickup_only: "Retrait uniquement",
  deliverable: "Livrable",
  quote: "Transport sur devis",
} as const;

export const purchaseModeLabels = {
  standard: "Commande directe",
  reservation: "Sur réservation",
  quote: "Sur devis",
} as const;

export const priceVisibilityLabels = {
  visible: "Prix affiché",
  hidden: "Prix masqué",
  on_request: "Prix sur demande",
} as const;

export const stockDisplayModeLabels = {
  hidden: "Ne rien afficher",
  exact: "Quantité exacte",
  status_label: "Libellé de disponibilité",
  custom_message: "Message personnalisé",
} as const;

export const stockStatusLabelLabels = {
  available: "Disponible",
  reservation_open: "Réservations ouvertes",
  limited: "Quantités limitées",
  coming_soon: "Bientôt disponible",
  sold_out: "Épuisé",
} as const;
