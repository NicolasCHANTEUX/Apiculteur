// Libellés du journal d'audit (table audit_logs) pour le tableau de bord,
// sans dépendance à Next ni à Supabase (testables).

const statusLabels: Record<string, string> = {
  draft: "brouillon",
  published: "publié",
  hidden: "masqué",
  sold_out: "épuisé",
  archived: "archivé",
};

const requestStatusLabels: Record<string, string> = {
  new: "nouvelle",
  in_progress: "en cours",
  answered: "réponse envoyée",
  closed: "clôturée",
};

const orderStepLabels: Record<string, string> = {
  preparing: "en préparation",
  ready: "prête",
  delivered: "terminée",
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

/** Phrase courte décrivant une action (« Stock mis à jour : 12 »). */
export function describeAuditAction(action: string, metadata: Record<string, unknown> | null): string {
  const meta = metadata ?? {};
  switch (action) {
    case "product.created":
      return "Produit créé";
    case "product.updated":
      return "Fiche modifiée";
    case "product.duplicated":
      return "Produit dupliqué";
    case "product.deleted":
      return "Produit supprimé définitivement";
    case "product.status_changed": {
      const label = statusLabels[String(meta.status)];
      return label ? `Passé en « ${label} »` : "Statut modifié";
    }
    case "product.stock_updated":
      return typeof meta.stock_quantity === "number"
        ? `Stock mis à jour : ${meta.stock_quantity}`
        : "Stock mis à jour";
    case "product.images_added":
      return typeof meta.count === "number"
        ? `${plural(meta.count, "photo ajoutée", "photos ajoutées")}`
        : "Photos ajoutées";
    case "product.image_deleted":
      return "Photo supprimée";
    case "product.images_reordered":
      return "Photos réordonnées";
    case "product.image_rotated":
      return "Photo tournée";
    case "product.image_alt_updated":
      return "Description de photo modifiée";
    case "category.created":
      return "Catégorie créée";
    case "category.updated":
      return "Catégorie modifiée";
    case "category.deleted":
      return "Catégorie supprimée";
    case "category.reordered":
      return "Ordre des catégories modifié";
    case "order.submitted":
      return "Demande reçue";
    case "order.accepted":
      return "Demande acceptée";
    case "order.refused":
      return "Demande refusée";
    case "order.cancelled":
      return "Commande annulée";
    case "order.status_changed": {
      const label = orderStepLabels[String(meta.status)];
      return label ? `Passée en « ${label} »` : "Étape modifiée";
    }
    case "order.paid":
      return typeof meta.method === "string" && meta.method ? `Paiement enregistré (${meta.method})` : "Paiement enregistré";
    case "order.note_updated":
      return "Note interne modifiée";
    case "order.proposed":
      return meta.link === true ? "Modification proposée au client (lien envoyé)" : "Modification proposée au client";
    case "order.proposal_accepted":
      if (meta.stock_short === true) return "Proposition acceptée, stock à vérifier";
      return meta.by === "admin" ? "Proposition appliquée (accord du client)" : "Proposition acceptée par le client";
    case "order.proposal_declined":
      return "Proposition déclinée par le client";
    case "order.proposal_withdrawn":
      return "Proposition retirée";
    case "order.manual_created":
      return meta.paid === true ? "Vente manuelle enregistrée (payée)" : "Vente manuelle enregistrée";
    case "settings.orders_open":
      return meta.open === true ? "Demandes en ligne ouvertes" : "Demandes en ligne fermées";
    case "delivery.origin_saved":
      return meta.located === false ? "Adresse de l’exploitation enregistrée (non localisée)" : "Adresse de l’exploitation enregistrée";
    case "delivery.settings_saved":
      return "Retrait et transport modifiés";
    case "delivery.thresholds_saved":
      return "Seuils de distance et de quantité modifiés";
    case "delivery.zone_created":
      return typeof meta.name === "string" ? `Zone de livraison « ${meta.name} » créée` : "Zone de livraison créée";
    case "delivery.zone_updated":
      return typeof meta.name === "string" ? `Zone de livraison « ${meta.name} » modifiée` : "Zone de livraison modifiée";
    case "delivery.zone_deleted":
      return typeof meta.name === "string" ? `Zone de livraison « ${meta.name} » supprimée` : "Zone de livraison supprimée";
    case "order.delivery_fee":
      return typeof meta.fee === "string" && Number(meta.fee) > 0 ? `Frais de livraison : ${meta.fee.replace(".", ",")} €` : "Livraison à convenir";
    case "legal.draft_saved":
      return "Brouillon des informations légales enregistré";
    case "legal.approved":
      return typeof meta.version === "number" ? `Informations légales publiées (version ${meta.version})` : "Informations légales publiées";
    case "customer.updated":
      return "Fiche client modifiée";
    case "customer.exported":
      return "Données d’un client exportées";
    case "customer.anonymized":
      return "Client anonymisé";
    case "customer.deleted":
      return "Client supprimé";
    case "privacy.purged":
      return "Données anciennes supprimées";
    case "settings.review_delay":
      return typeof meta.days === "number" && meta.days > 0 ? `Demande d’avis ${meta.days} jours après la livraison` : "Demandes d’avis automatiques coupées";
    case "review.submitted":
      return typeof meta.rating === "number" ? `Avis reçu : ${meta.rating} sur 5` : "Avis reçu";
    case "review.status_changed": {
      const labels: Record<string, string> = { displayed: "Avis publié", hidden: "Avis masqué", refused: "Avis refusé", pending: "Avis remis à modérer" };
      return labels[String(meta.status)] ?? "Statut d’avis modifié";
    }
    case "review.replied":
      return meta.removed === true ? "Réponse à un avis retirée" : "Réponse publiée sous un avis";
    case "review.featured":
      return meta.featured === true ? "Avis mis en avant" : "Avis retiré de la mise en avant";
    case "review.anonymized":
      return "Avis anonymisé";
    case "review.request_sent":
      return "Demande d’avis envoyée";
    case "settings.reviews_public":
      return meta.visible === true ? "Avis affichés sur le site" : "Avis masqués sur le site";
    case "email.sent_manually":
      return typeof meta.template_label === "string" ? `Email « ${meta.template_label} » envoyé depuis votre messagerie` : "Email envoyé depuis votre messagerie";
    case "email.skipped":
      return typeof meta.template_label === "string" ? `Email « ${meta.template_label} » écarté` : "Email écarté";
    case "email.restored":
      return typeof meta.template_label === "string" ? `Email « ${meta.template_label} » remis à envoyer` : "Email remis à envoyer";
    case "email.test_sent":
      return "Email de test envoyé";
    case "request.received":
      return "Demande reçue";
    case "request.status_changed": {
      const label = requestStatusLabels[String(meta.status)];
      return label ? `Passée en « ${label} »` : "Statut modifié";
    }
    case "request.replied":
      return meta.prepared === true ? "Réponse préparée (à envoyer depuis la messagerie)" : "Réponse envoyée";
    case "request.note_updated":
      return "Note interne modifiée";
    case "request.trashed":
      return "Mise à la corbeille";
    case "request.restored":
      return "Sortie de la corbeille";
    case "request.deleted":
      return "Demande supprimée définitivement";
    default:
      return action;
  }
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** « à l'instant », « il y a 5 minutes », « hier »… au-delà d'une semaine, la date. */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 60) return "à l’instant";
  if (Math.abs(seconds) >= 7 * 86_400) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Paris",
    }).format(date);
  }
  const format = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(seconds, "second");
}
