// Questions fréquentes, partagées entre la page FAQ et l'accueil. Questions
// de la maquette ; les réponses (absentes de la maquette, qui ne montre que
// les questions repliées) suivent le cahier des charges et sont à valider
// par l'apiculteur.

export const faqThemes = {
  commander: "Commander",
  livraison: "Livraison et retrait",
  paiement: "Paiement et factures",
  avis: "Avis",
} as const;

export type FaqTheme = keyof typeof faqThemes;

export type FaqItem = {
  /** Ancre de la question (lien partageable /faq#…). */
  id: string;
  theme: FaqTheme;
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

export const faq: FaqItem[] = [
  {
    id: "reserver-un-essaim",
    theme: "commander",
    question: "Comment réserver un essaim ?",
    answer:
      "Choisissez votre essaim dans le catalogue, indiquez la quantité souhaitée et envoyez votre demande de commande. Pour les essaims proposés sur réservation, votre demande vous garantit une place pour la saison : je vous recontacte pour confirmer les détails.",
    link: { href: "/catalogue", label: "Voir les essaims disponibles" },
  },
  {
    id: "disponibilite-des-essaims",
    theme: "commander",
    question: "Quand les essaims sont-ils disponibles ?",
    answer:
      "Les essaims sont prêts au printemps, selon la météo et le développement des colonies. La disponibilité de chaque essaim est indiquée sur sa fiche, et les réservations pour la saison suivante ouvrent en avance.",
    link: { href: "/catalogue?vue=reservation", label: "Voir les produits sur réservation" },
  },
  {
    id: "grandes-quantites",
    theme: "commander",
    question: "Peut-on commander plusieurs dizaines d'essaims ?",
    answer:
      "Oui. Les grandes quantités bénéficient de tarifs dégressifs. Afin de garantir des essaims de qualité et une livraison adaptée, ces demandes sont d'abord étudiées personnellement avant validation définitive.",
    link: { href: "/contact?type=devis", label: "Demander un devis" },
  },
  {
    id: "essaim-chez-moi",
    theme: "commander",
    question: "Un essaim s'est posé chez moi : que faire ?",
    answer:
      "Pas de panique : un essaim qui vient de se poser est en général calme. Gardez vos distances, ne l'aspergez pas et n'essayez pas de le déplacer. Signalez-le moi avec son emplacement et, si possible, une photo : je vous rappelle pour voir si je peux venir le récupérer.",
    link: { href: "/contact?type=essaim", label: "Signaler un essaim" },
  },
  {
    id: "validation-des-commandes",
    theme: "commander",
    question: "Pourquoi certaines commandes nécessitent-elles une validation ?",
    answer:
      "Lorsqu'une commande concerne une quantité importante ou une distance de livraison élevée, je l'étudie avant de la confirmer pour garantir une livraison sérieuse et adaptée. Aucun paiement ne vous est demandé avant cette validation.",
  },
  {
    id: "livraison-en-france",
    theme: "livraison",
    question: "Livrez-vous partout en France ?",
    answer:
      "Le retrait sur l'exploitation en Normandie est toujours possible. La livraison dépend de la distance et du nombre d'essaims : au-delà d'une certaine distance, elle est organisée au cas par cas, en concertation avec vous.",
  },
  {
    id: "frais-de-livraison",
    theme: "livraison",
    question: "Comment sont calculés les frais de livraison ?",
    answer:
      "Ils dépendent de la distance et de la quantité commandée. Ils vous sont indiqués lors de la demande lorsque c'est possible, ou confirmés après étude pour les livraisons éloignées et les commandes importantes.",
  },
  {
    id: "paiement",
    theme: "paiement",
    question: "Comment se passe le paiement ?",
    answer:
      "Selon la commande : par virement, à la récupération des essaims ou sur facture. Les modalités vous sont confirmées avec votre commande, et aucun paiement immédiat n'est demandé si celle-ci doit d'abord être validée.",
  },
  {
    id: "facture",
    theme: "paiement",
    question: "Quand vais-je recevoir ma facture ?",
    answer:
      "La facture vous est envoyée par email une fois votre commande validée. Vous pouvez aussi la demander à tout moment par message.",
    link: { href: "/contact?sujet=Facture", label: "Demander une facture" },
  },
  {
    id: "laisser-un-avis",
    theme: "avis",
    question: "Comment laisser un avis ?",
    answer:
      "Après votre commande, vous recevez un email avec un lien personnel et sécurisé pour donner votre avis, sans créer de compte. Votre avis n'est publié qu'avec votre accord.",
    link: { href: "/avis", label: "Lire les avis clients" },
  },
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Questions dont la question ou la réponse contient tous les mots cherchés. */
export function searchFaq(items: FaqItem[], query: string): FaqItem[] {
  const words = normalize(query).split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const haystack = normalize(`${item.question} ${item.answer}`);
    return words.every((word) => haystack.includes(word));
  });
}

/**
 * Découpe un texte en morceaux à surligner (mots cherchés, sans tenir
 * compte des accents ni de la casse).
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const words = normalize(query).split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return [{ text, match: false }];
  // La normalisation conserve la longueur des lettres de base (accents retirés
  // après décomposition) : on repère les positions dans le texte normalisé
  // caractère par caractère.
  const base = [...text].map((char) => normalize(char));
  const flat = base.join("");
  const marked = new Array<boolean>(flat.length).fill(false);
  for (const word of words) {
    let from = flat.indexOf(word);
    while (from !== -1) {
      for (let i = from; i < from + word.length; i += 1) marked[i] = true;
      from = flat.indexOf(word, from + word.length);
    }
  }
  // Ramène les positions du texte normalisé aux caractères d'origine.
  const parts: { text: string; match: boolean }[] = [];
  let offset = 0;
  [...text].forEach((char, index) => {
    const length = base[index].length;
    const match = length > 0 && marked.slice(offset, offset + length).some(Boolean);
    offset += length;
    const last = parts.at(-1);
    if (last && last.match === match) last.text += char;
    else parts.push({ text: char, match });
  });
  return parts;
}
