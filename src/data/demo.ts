import type { PublicCategory, PublicProduct } from "@/data/catalog";
import type { PublicReview } from "@/data/reviews";

// Contenu d'exemple de la maquette Figma. Utilise UNIQUEMENT en
// developpement quand Supabase n'est pas configure (cf. isDemoMode), pour
// travailler le visuel sans base. Ne jamais l'afficher en production : les
// avis ci-dessous ne sont pas de vrais avis clients.

const essaims: PublicCategory = { id: "demo-cat-essaims", name: "Essaims", slug: "essaims" };
const reines: PublicCategory = { id: "demo-cat-reines", name: "Reines", slug: "reines" };

const productDefaults = {
  priceVisibility: "visible",
  purchaseMode: "standard",
  featured: false,
  stockDisplayMode: "status_label",
  stockStatusLabel: null,
  stockCustomMessage: null,
  displayedStockQuantity: null,
  seoTitle: null,
  seoDescription: null,
} satisfies Partial<PublicProduct>;

export const demoProducts: PublicProduct[] = [
  {
    ...productDefaults,
    id: "demo-buckfast",
    category: essaims,
    name: "Essaim Buckfast sur 5 cadres",
    slug: "essaim-buckfast-5-cadres",
    shortDescription:
      "Essaim polyvalent, doux et productif. Idéal pour les apiculteurs de tous niveaux.",
    longDescription:
      "Essaim sur 5 cadres avec reine Buckfast de l'année, fécondée et testée.\n\nLa Buckfast est appréciée pour sa douceur, sa faible tendance à l'essaimage et sa bonne production. Un excellent choix pour démarrer ou renforcer un rucher.",
    basePrice: 160,
    featured: true,
    stockStatusLabel: "available",
    images: [
      { url: "/images/essaims/buckfast-5-cadres.jpg", altText: "Apiculteur portant un cadre de ruche dans une prairie" },
    ],
    pricingTiers: [
      { minQuantity: 1, maxQuantity: 4, unitPrice: 160 },
      { minQuantity: 5, maxQuantity: 9, unitPrice: 150 },
      { minQuantity: 10, maxQuantity: null, unitPrice: 145 },
    ],
  },
  {
    ...productDefaults,
    id: "demo-carnica",
    category: essaims,
    name: "Essaim Carnica",
    slug: "essaim-carnica",
    shortDescription:
      "Race alpine réputée pour son hivernage économique et sa douceur naturelle.",
    longDescription:
      "Essaim sur 5 cadres avec reine Carnica.\n\nAbeille calme, économe en hiver et rapide au démarrage du printemps.",
    basePrice: 165,
    stockStatusLabel: "limited",
    images: [
      { url: "/images/essaims/carnica.jpg", altText: "Apiculteur en tenue inspectant une ruchette avec un enfumoir" },
    ],
    pricingTiers: [
      { minQuantity: 1, maxQuantity: 4, unitPrice: 165 },
      { minQuantity: 5, maxQuantity: null, unitPrice: 148 },
    ],
  },
  {
    ...productDefaults,
    id: "demo-local",
    category: essaims,
    name: "Essaim local Normandie",
    slug: "essaim-local-normandie",
    shortDescription:
      "Abeilles locales adaptées au climat et à la flore de Normandie.",
    longDescription:
      "Essaim issu de souches locales, sélectionnées pour leur adaptation au climat normand.\n\nDisponible uniquement sur réservation pour la saison prochaine.",
    basePrice: 140,
    purchaseMode: "reservation",
    stockDisplayMode: "custom_message",
    stockCustomMessage: "Réservations ouvertes — saison 2027",
    images: [
      { url: "/images/essaims/local-normandie.jpg", altText: "Abeilles à l'entrée d'une ruche en bois" },
    ],
    pricingTiers: [
      { minQuantity: 1, maxQuantity: 4, unitPrice: 140 },
      { minQuantity: 5, maxQuantity: null, unitPrice: 130 },
    ],
  },
  {
    ...productDefaults,
    id: "demo-reine",
    category: reines,
    name: "Reine fécondée Buckfast",
    slug: "reine-fecondee-buckfast",
    shortDescription:
      "Reine fécondée en plein air, testée et marquée, livrée en cagette.",
    longDescription:
      "Reine Buckfast fécondée en plein air, testée et marquée de l'année.\n\nLivrée en cagette avec ses accompagnatrices.",
    basePrice: 38,
    stockDisplayMode: "custom_message",
    stockCustomMessage: "Sur demande",
    images: [
      { url: "/images/essaims/reine-buckfast.jpg", altText: "Rayon de cire operculé" },
    ],
    pricingTiers: [
      { minQuantity: 1, maxQuantity: 9, unitPrice: 38 },
      { minQuantity: 10, maxQuantity: null, unitPrice: 35 },
    ],
  },
];

function demoReview(
  review: Omit<PublicReview, "createdAt" | "adminReply" | "featured"> &
    Partial<Pick<PublicReview, "adminReply" | "featured">>,
): PublicReview {
  return {
    adminReply: null,
    featured: false,
    ...review,
    createdAt: review.submittedAt ?? "2026-01-01T00:00:00Z",
  };
}

export const demoReviews: PublicReview[] = [
  demoReview({
    id: "demo-review-1",
    productId: "demo-buckfast",
    customerName: "Claire M.",
    rating: 5,
    comment:
      "Des essaims de très belle qualité, reçus en parfait état. Marc a pris le temps de répondre à toutes mes questions avant la livraison. Je recommande vivement !",
    adminReply:
      "Merci Claire ! Ce fut un plaisir de vous accompagner. N'hésitez pas si vous avez des questions pendant la saison.",
    featured: true,
    submittedAt: "2026-06-14T09:00:00Z",
  }),
  demoReview({
    id: "demo-review-2",
    productId: "demo-carnica",
    customerName: "Julien M.",
    rating: 5,
    comment:
      "C'est la deuxième fois que je commande chez Marc. Sérieux, disponible, et ses abeilles sont vraiment douces. Un vrai professionnel passionné.",
    featured: true,
    submittedAt: "2026-05-20T09:00:00Z",
  }),
  demoReview({
    id: "demo-review-3",
    productId: "demo-local",
    customerName: "Élodie L.",
    rating: 4,
    comment:
      "Très bon contact, livraison bien organisée malgré la distance. Les essaims se sont très bien développés. Quelques questions après réception, Marc a répondu rapidement.",
    adminReply:
      "Merci pour ce retour Élodie ! Ravi que tout se soit bien passé malgré la distance.",
    featured: true,
    submittedAt: "2026-04-18T09:00:00Z",
  }),
  demoReview({
    id: "demo-review-4",
    productId: "demo-buckfast",
    customerName: "Thomas B.",
    rating: 5,
    comment:
      "Première expérience en apiculture, Marc a su me rassurer et me guider. Les essaims sont repartis très fort. Déjà 3 hausses sur 5 ruches.",
    submittedAt: "2025-06-22T09:00:00Z",
  }),
  demoReview({
    id: "demo-review-5",
    productId: "demo-reine",
    customerName: "Amandine P.",
    rating: 5,
    comment:
      "Commande de 10 reines, toutes parfaites. Livraison soignée, reines bien accompagnées. Marc a même joint une petite note de conseils. Très professionnel.",
    submittedAt: "2025-05-15T09:00:00Z",
  }),
  demoReview({
    id: "demo-review-6",
    productId: "demo-carnica",
    customerName: "Pierre-Henri D.",
    rating: 4,
    comment:
      "Bon essaim, bien développé à la réception. Le contact avec Marc est agréable. Un tout petit bémol sur le délai de livraison légèrement plus long que prévu mais Marc avait prévenu.",
    submittedAt: "2025-04-10T09:00:00Z",
  }),
];
