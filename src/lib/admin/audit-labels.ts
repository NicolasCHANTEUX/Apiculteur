// Libellés du journal d'audit (table audit_logs) pour le tableau de bord,
// sans dépendance à Next ni à Supabase (testables).

const statusLabels: Record<string, string> = {
  draft: "brouillon",
  published: "publié",
  hidden: "masqué",
  sold_out: "épuisé",
  archived: "archivé",
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
