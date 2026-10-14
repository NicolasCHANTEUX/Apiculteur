// Configuration légale (CAHIER §19) : champs, valeurs par défaut,
// contrôles et détection des valeurs provisoires. Les pages légales ne sont
// publiées qu'à partir d'une version complète et approuvée. Sans dépendance
// à Next (testable).

export type LegalConfig = {
  businessName: string;
  legalForm: string;
  ownerName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  siret: string;
  registration: string;
  vatMode: "franchise" | "assujetti";
  vatNumber: string;
  beekeeperNumber: string;
  email: string;
  phone: string;
  publicationDirector: string;
  hostName: string;
  hostAddress: string;
  hostWebsite: string;
  dataHost: string;
  mediatorName: string;
  mediatorWebsite: string;
  paymentTerms: string;
  deliveryTerms: string;
  withdrawalTerms: string;
  warrantyTerms: string;
  reservationTerms: string;
  requestsRetentionMonths: number;
  emailLogMonths: number;
  trashDays: number;
};

type TextField = Exclude<keyof LegalConfig, "vatMode" | "requestsRetentionMonths" | "emailLogMonths" | "trashDays">;

export const legalForms = ["Entreprise individuelle", "EARL", "GAEC", "SCEA", "SARL", "SAS", "Autre"] as const;

/** Libellés, longueurs maximales et caractère obligatoire des champs texte. */
export const legalFields: Record<TextField, { label: string; max: number; required: boolean; hint?: string; multiline?: boolean }> = {
  businessName: { label: "Nom ou raison sociale", max: 120, required: true },
  legalForm: { label: "Forme juridique", max: 60, required: true },
  ownerName: { label: "Exploitant ou représentant légal", max: 120, required: true },
  addressLine: { label: "Adresse du siège", max: 200, required: true },
  postalCode: { label: "Code postal", max: 5, required: true },
  city: { label: "Ville", max: 100, required: true },
  siret: { label: "SIRET", max: 17, required: true, hint: "14 chiffres." },
  registration: { label: "Immatriculation", max: 160, required: false, hint: "Ex. « RCS Caen 123 456 789 » ou « Registre des actifs agricoles »." },
  vatNumber: { label: "Numéro de TVA intracommunautaire", max: 20, required: false },
  beekeeperNumber: { label: "Numéro d’apiculteur (NAPI)", max: 30, required: false },
  email: { label: "Email de contact", max: 254, required: true },
  phone: { label: "Téléphone", max: 30, required: true },
  publicationDirector: { label: "Directeur de la publication", max: 120, required: true, hint: "En général, l’exploitant." },
  hostName: { label: "Hébergeur du site", max: 120, required: true },
  hostAddress: { label: "Adresse de l’hébergeur", max: 200, required: true },
  hostWebsite: { label: "Site de l’hébergeur", max: 200, required: false },
  dataHost: { label: "Hébergement des données", max: 300, required: true, multiline: true },
  mediatorName: { label: "Médiateur de la consommation", max: 160, required: true, hint: "Obligatoire pour vendre à des particuliers." },
  mediatorWebsite: { label: "Site du médiateur", max: 200, required: true },
  paymentTerms: { label: "Paiement", max: 2000, required: true, multiline: true },
  deliveryTerms: { label: "Retrait et livraison", max: 2000, required: true, multiline: true },
  withdrawalTerms: { label: "Droit de rétractation", max: 3000, required: true, multiline: true },
  warrantyTerms: { label: "Garanties", max: 3000, required: true, multiline: true },
  reservationTerms: { label: "Réservations et commandes spéciales", max: 3000, required: true, multiline: true },
};

export const retentionFields = {
  requestsRetentionMonths: { label: "Demandes de contact traitées", unit: "mois", min: 1, max: 60 },
  emailLogMonths: { label: "Journal des emails", unit: "mois", min: 1, max: 36 },
  trashDays: { label: "Demandes dans la corbeille", unit: "jours", min: 1, max: 90 },
} as const;

/** Marque d'un texte proposé qui doit être relu avant publication. */
const TO_REVIEW = "[À faire valider]";

export const defaultLegalConfig: LegalConfig = {
  businessName: "",
  legalForm: "",
  ownerName: "",
  addressLine: "",
  postalCode: "",
  city: "",
  siret: "",
  registration: "",
  vatMode: "franchise",
  vatNumber: "",
  beekeeperNumber: "",
  email: "",
  phone: "",
  publicationDirector: "",
  hostName: "Vercel Inc.",
  hostAddress: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
  hostWebsite: "https://vercel.com",
  dataHost: `${TO_REVIEW} Supabase Inc. (base de données et fichiers) ; région d’hébergement à vérifier dans le tableau de bord Supabase.`,
  mediatorName: "",
  mediatorWebsite: "",
  paymentTerms: "Aucun paiement n’est demandé en ligne. Le règlement s’effectue par virement, chèque ou espèces, selon les modalités confirmées lors de l’acceptation de la commande.",
  deliveryTerms: "Les produits sont remis sur l’exploitation, sur rendez-vous, ou livrés selon des conditions convenues lors de l’acceptation de la commande. Les frais éventuels sont annoncés avant tout engagement.",
  withdrawalTerms: `${TO_REVIEW} Pour le matériel, le client particulier dispose d’un délai de quatorze jours à compter de la réception pour exercer son droit de rétractation (article L221-18 du Code de la consommation). Pour les colonies et reines d’abeilles vivantes, l’application de l’exception prévue pour les biens susceptibles de se détériorer rapidement (article L221-28) doit être validée avant publication.`,
  warrantyTerms: `${TO_REVIEW} Le vendeur répond des garanties légales applicables aux biens vendus : garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) pour le matériel, et garantie des vices cachés (articles 1641 et suivants du Code civil). Les règles applicables aux colonies et reines vivantes sont à préciser avant publication.`,
  reservationTerms: `${TO_REVIEW} Une réservation garantit une place pour la saison indiquée. La date de mise à disposition dépend du développement des colonies et de la météo ; elle est confirmée personnellement. Préciser ici l’acompte éventuel, les conditions de report et d’annulation.`,
  requestsRetentionMonths: 36,
  emailLogMonths: 12,
  trashDays: 30,
};

// Valeurs de la maquette (src/lib/site.ts) et marques de texte provisoire.
const MAQUETTE_VALUES = ["marc dupont", "contact@ruchers-normandie.fr", "06 12 34 56 78", "0612345678", "+33612345678"];
const PLACEHOLDER = /\[(?:à|a) (?:faire valider|compléter|completer|vérifier|verifier)[^\]]*\]|à vérifier|à compléter|lorem ipsum|x{3,}|example\.(?:com|org|fr)|\b0{9,}\b|123 ?456 ?789/i;

export function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return MAQUETTE_VALUES.some((sample) => normalized.includes(sample)) || PLACEHOLDER.test(value);
}

/** Contrôle de clé du SIRET (algorithme de Luhn). */
export function isValidSiret(value: string) {
  const digits = value.replace(/\s/g, "");
  if (!/^\d{14}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 14; index += 1) {
    let digit = Number(digits[13 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export type LegalCheck = {
  missing: TextField[];
  placeholders: TextField[];
  invalid: Partial<Record<TextField, string>>;
  ready: boolean;
};

/** Ce qui empêche l'approbation : champs vides, provisoires ou invalides. */
export function checkLegalConfig(config: LegalConfig): LegalCheck {
  const fields = Object.keys(legalFields) as TextField[];
  const required = (field: TextField) => legalFields[field].required || (field === "vatNumber" && config.vatMode === "assujetti");
  const missing = fields.filter((field) => required(field) && !config[field].trim());
  const placeholders = fields.filter((field) => isPlaceholderValue(config[field]));
  const invalid: LegalCheck["invalid"] = {};
  if (config.siret.trim() && !isValidSiret(config.siret)) invalid.siret = "SIRET invalide (14 chiffres, clé de contrôle).";
  if (config.postalCode.trim() && !/^\d{5}$/.test(config.postalCode.trim())) invalid.postalCode = "Code postal à 5 chiffres.";
  if (config.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim())) invalid.email = "Adresse email invalide.";
  if (config.phone.trim() && (config.phone.match(/\d/g)?.length ?? 0) < 10) invalid.phone = "Numéro de téléphone invalide.";
  if (config.vatMode === "assujetti" && config.vatNumber.trim() && !/^FR[0-9A-Z]{2}\d{9}$/.test(config.vatNumber.replace(/\s/g, "").toUpperCase())) {
    invalid.vatNumber = "Format attendu : FR suivi de 11 caractères.";
  }
  for (const field of ["hostWebsite", "mediatorWebsite"] as const) {
    const value = config[field].trim();
    if (value && !/^https:\/\/[^\s]+\.[^\s]+$/.test(value)) invalid[field] = "Adresse complète attendue, commençant par https://";
  }
  return { missing, placeholders, invalid, ready: !missing.length && !placeholders.length && !Object.keys(invalid).length };
}

type FormLike = { get(name: string): FormDataEntryValue | null };

/** Lecture du formulaire de l'admin (valeurs tronquées, jamais refusées : un brouillon peut être incomplet). */
export function parseLegalForm(form: FormLike): LegalConfig {
  const text = (name: string, max: number) => {
    const value = form.get(name);
    return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
  };
  const config = { ...defaultLegalConfig };
  for (const [field, meta] of Object.entries(legalFields) as [TextField, (typeof legalFields)[TextField]][]) {
    config[field] = text(field, meta.max);
  }
  config.vatMode = form.get("vatMode") === "assujetti" ? "assujetti" : "franchise";
  for (const [field, meta] of Object.entries(retentionFields) as [keyof typeof retentionFields, (typeof retentionFields)[keyof typeof retentionFields]][]) {
    const value = Number(form.get(field));
    config[field] = Number.isInteger(value) ? Math.min(meta.max, Math.max(meta.min, value)) : defaultLegalConfig[field];
  }
  return config;
}

/** Configuration enregistrée (brouillon ou version), complétée par les valeurs par défaut. */
export function normalizeLegalConfig(value: unknown): LegalConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const config = { ...defaultLegalConfig };
  for (const field of Object.keys(legalFields) as TextField[]) {
    if (typeof source[field] === "string") config[field] = source[field] as string;
  }
  if (source.vatMode === "assujetti" || source.vatMode === "franchise") config.vatMode = source.vatMode;
  for (const field of Object.keys(retentionFields) as (keyof typeof retentionFields)[]) {
    if (typeof source[field] === "number") config[field] = source[field] as number;
  }
  return config;
}
