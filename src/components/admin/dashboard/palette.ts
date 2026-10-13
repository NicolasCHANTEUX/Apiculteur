// Couleurs des graphiques du tableau de bord, partagées entre composants
// serveur et client (un module « use client » ne peut pas exporter de
// valeurs vers un composant serveur).

// Catégorielle (miel, sarcelle, terre cuite, violet, vert), validée avec le
// script du guide dataviz : séparation daltonisme ≥ 12, vision normale ≥ 23.
// Le miel est sous 3:1 sur blanc : les parts sont toujours accompagnées d'une
// légende chiffrée. La couleur suit l'entité (son ordre), jamais son rang.
export const categoryColors = ["#d99a2b", "#12958b", "#cf5b2e", "#7b5cc9", "#5e9a1f"];

/** Part « Autres » (regroupement au-delà de cinq). */
export const otherColor = "#b8ae9f";

// Statuts (palette fixe) : toujours accompagnés d'une icône et d'un libellé.
export const statusColors = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" } as const;
