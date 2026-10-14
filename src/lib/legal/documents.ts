// Mentions légales, CGV et politique de confidentialité générées depuis la
// configuration légale approuvée (CAHIER §19). Textes sobres et standards,
// à faire relire ; les passages propres au métier sont des champs de la
// configuration. Sans dépendance à Next (testable).

import type { LegalConfig } from "./config.ts";

export type LegalLink = { label: string; href: string };
export type LegalSection = { heading: string; paragraphs: string[]; list?: string[]; links?: LegalLink[] };
export type LegalDocument = { title: string; intro: string; sections: LegalSection[] };

export type LegalContext = {
  siteName: string;
  /** Origine publique, ex. https://ruchers.fr */
  siteUrl: string;
  version: number;
  /** Date d'approbation (ISO). */
  approvedAt: string;
  /** Service d'envoi des emails, s'il est configuré. */
  emailProvider: string | null;
};

export type LegalDocumentKey = "mentions-legales" | "cgv" | "confidentialite";

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function host(siteUrl: string) {
  return siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function address(config: LegalConfig) {
  return `${config.addressLine}, ${config.postalCode} ${config.city}`;
}

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

/** « EARL du Rucher, représentée par… » ou « Le Rucher, entreprise individuelle de… ». */
function owner(config: LegalConfig) {
  if (config.legalForm === "Entreprise individuelle") return `${config.businessName}, entreprise individuelle de ${config.ownerName}.`;
  const form = config.legalForm && config.legalForm !== "Autre" ? `, ${config.legalForm}` : "";
  return `${config.businessName}${form}, représentée par ${config.ownerName}.`;
}

function vatMention(config: LegalConfig) {
  return config.vatMode === "assujetti"
    ? `Numéro de TVA intracommunautaire : ${config.vatNumber}.`
    : "TVA non applicable, article 293 B du Code général des impôts.";
}

/** Ligne de version affichée en bas de chaque document. */
export function versionLine(context: LegalContext) {
  return `Version ${context.version}, en vigueur depuis le ${day.format(new Date(context.approvedAt))}.`;
}

export function mentionsLegales(config: LegalConfig, context: LegalContext): LegalDocument {
  const identity = [
    owner(config),
    `Siège : ${address(config)}.`,
    `SIRET : ${config.siret}.${config.registration ? ` ${config.registration}.` : ""}`,
    vatMention(config),
  ];
  if (config.beekeeperNumber) identity.push(`Numéro d’apiculteur (NAPI) : ${config.beekeeperNumber}.`);
  identity.push(`Contact : ${config.email}, ${config.phone}.`);

  return {
    title: "Mentions légales",
    intro: `Informations relatives à l’éditeur du site ${host(context.siteUrl)}.`,
    sections: [
      { heading: "Éditeur du site", paragraphs: identity },
      { heading: "Directeur de la publication", paragraphs: [config.publicationDirector] },
      {
        heading: "Hébergement",
        paragraphs: [`Le site est hébergé par ${config.hostName}, ${config.hostAddress}.`, `Données : ${config.dataHost}`],
        links: config.hostWebsite ? [{ label: config.hostWebsite.replace(/^https:\/\//, ""), href: config.hostWebsite }] : undefined,
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          `Les textes, photographies et éléments graphiques du site sont la propriété de ${config.businessName}, sauf mention contraire. Toute reproduction sans autorisation préalable est interdite.`,
        ],
      },
      {
        heading: "Données personnelles",
        paragraphs: ["Le traitement des données personnelles collectées sur le site est décrit dans la politique de confidentialité."],
        links: [{ label: "Politique de confidentialité", href: "/confidentialite" }],
      },
    ],
  };
}

export function conditionsGenerales(config: LegalConfig, context: LegalContext): LegalDocument {
  return {
    title: "Conditions générales de vente",
    intro: `Conditions applicables aux ventes conclues par ${config.businessName} depuis le site ${host(context.siteUrl)} ou directement.`,
    sections: [
      {
        heading: "1. Objet",
        paragraphs: [
          `Les présentes conditions régissent les ventes conclues entre ${config.businessName} (le vendeur) et toute personne passant une demande de commande ou une réservation (le client). Elles comprennent des conditions générales et des conditions particulières aux réservations et commandes spéciales (article 8).`,
        ],
      },
      {
        heading: "2. Commandes",
        paragraphs: [
          "Le client envoie une demande de commande depuis son panier. Cette demande ne l’engage, comme le vendeur, qu’après son acceptation par le vendeur, confirmée par email.",
          "Les demandes portant sur de grandes quantités ou une livraison éloignée sont étudiées personnellement : le vendeur peut les refuser ou proposer une alternative. Les CGV acceptées sont celles en vigueur au jour de la demande.",
        ],
      },
      {
        heading: "3. Prix",
        paragraphs: [
          `Les prix sont indiqués en euros. ${config.vatMode === "assujetti" ? "Ils s’entendent toutes taxes comprises." : vatMention(config)}`,
          "Des prix dégressifs s’appliquent selon la quantité, comme indiqué sur chaque fiche produit. Les frais éventuels de livraison sont annoncés avant l’acceptation de la commande.",
        ],
      },
      { heading: "4. Paiement", paragraphs: paragraphs(config.paymentTerms) },
      { heading: "5. Retrait et livraison", paragraphs: paragraphs(config.deliveryTerms) },
      { heading: "6. Droit de rétractation", paragraphs: paragraphs(config.withdrawalTerms) },
      { heading: "7. Garanties", paragraphs: paragraphs(config.warrantyTerms) },
      { heading: "8. Réservations et commandes spéciales", paragraphs: paragraphs(config.reservationTerms) },
      {
        heading: "9. Données personnelles",
        paragraphs: ["Les données transmises lors d’une commande servent à la traiter, selon la politique de confidentialité."],
        links: [{ label: "Politique de confidentialité", href: "/confidentialite" }],
      },
      {
        heading: "10. Médiation et droit applicable",
        paragraphs: [
          `En cas de litige, le client écrit d’abord au vendeur (${config.email}). À défaut d’accord, le client consommateur peut recourir gratuitement au médiateur de la consommation : ${config.mediatorName}.`,
          "Les présentes conditions sont soumises au droit français.",
        ],
        links: [{ label: config.mediatorWebsite.replace(/^https:\/\//, ""), href: config.mediatorWebsite }],
      },
    ],
  };
}

export function politiqueConfidentialite(config: LegalConfig, context: LegalContext): LegalDocument {
  const processors = [
    `${config.hostName} : hébergement du site.`,
    `${config.dataHost.replace(/\.$/, "")}.`,
    context.emailProvider ? `${context.emailProvider} : envoi des emails liés à vos demandes et commandes.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: "Politique de confidentialité",
    intro: `Comment ${config.businessName} utilise et protège les données que vous confiez au site ${host(context.siteUrl)}.`,
    sections: [
      {
        heading: "Responsable du traitement",
        paragraphs: [`${config.businessName}, ${address(config)}. Contact : ${config.email}.`],
      },
      {
        heading: "Données collectées et usages",
        paragraphs: ["Seules les données utiles à votre demande sont collectées :"],
        list: [
          "Demande de commande : nom, email, téléphone, adresse de livraison, entreprise, message. Pour traiter la commande et organiser le retrait ou la livraison (exécution du contrat).",
          "Demande de contact, de devis ou signalement d’essaim : nom, email, téléphone, message, lieu et photos éventuelles. Pour vous répondre (mesures précontractuelles et intérêt légitime).",
          "Avis : note, commentaire et nom affiché. Publiés uniquement avec votre accord, que vous pouvez retirer à tout moment (consentement).",
          "Factures et pièces comptables : pour respecter les obligations légales.",
          "Protection contre les abus : empreinte chiffrée de l’adresse IP, conservée le temps de la limitation (intérêt légitime).",
        ],
      },
      {
        heading: "Destinataires",
        paragraphs: [
          `Vos données sont réservées à ${config.businessName}. Elles ne sont ni vendues ni utilisées à des fins publicitaires. Des prestataires techniques les traitent pour son compte :`,
        ],
        list: processors,
      },
      {
        heading: "Transferts hors de l’Union européenne",
        paragraphs: [
          "Certains prestataires peuvent être établis hors de l’Union européenne. Les transferts sont alors encadrés par les garanties prévues par le RGPD (décision d’adéquation ou clauses contractuelles types).",
        ],
      },
      {
        heading: "Durées de conservation",
        paragraphs: ["Les données sont supprimées automatiquement au terme de ces durées :"],
        list: [
          "Commandes et factures : 10 ans (obligation comptable).",
          `Demandes de contact traitées : ${config.requestsRetentionMonths} mois ; demandes mises à la corbeille : ${config.trashDays} jours.`,
          `Journal des emails envoyés : ${config.emailLogMonths} mois.`,
          "Avis : tant qu’ils sont publiés, sauf demande de retrait.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          `Vous pouvez accéder à vos données, les faire rectifier ou effacer, en limiter l’usage, vous y opposer ou en demander une copie, en écrivant à ${config.email}. Les commandes déjà passées restent conservées, sous forme anonymisée, le temps des obligations comptables.`,
          "Vous pouvez aussi adresser une réclamation à la CNIL.",
        ],
        links: [{ label: "cnil.fr", href: "https://www.cnil.fr" }],
      },
      {
        heading: "Cookies et stockage",
        paragraphs: [
          "Le site n’utilise aucun traceur publicitaire ni outil de mesure d’audience. Votre panier est conservé dans votre navigateur et l’espace d’administration utilise un cookie de connexion : ces éléments, indispensables au fonctionnement, ne nécessitent pas de consentement.",
        ],
      },
      {
        heading: "Sécurité",
        paragraphs: [
          "Les échanges sont chiffrés (HTTPS), l’accès aux données est restreint à l’administrateur, et les photos jointes aux demandes sont conservées dans un espace privé.",
        ],
      },
    ],
  };
}

export function legalDocument(key: LegalDocumentKey, config: LegalConfig, context: LegalContext) {
  if (key === "mentions-legales") return mentionsLegales(config, context);
  if (key === "cgv") return conditionsGenerales(config, context);
  return politiqueConfidentialite(config, context);
}
