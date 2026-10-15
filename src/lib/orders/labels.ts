// Libellés des statuts de commande (enums de supabase/migrations/
// 20260921120200_customers_orders.sql).

export type FulfillmentStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";
export type ValidationStatus = "not_required" | "pending" | "proposed" | "accepted" | "refused";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "cancelled";

export const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  pending: "À traiter",
  preparing: "En préparation",
  ready: "Prête",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const validationLabels: Record<ValidationStatus, string> = {
  not_required: "Sans validation",
  pending: "À valider",
  proposed: "Modification proposée",
  accepted: "Acceptée",
  refused: "Refusée",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Non payée",
  pending: "Paiement en attente",
  paid: "Payée",
  refunded: "Remboursée",
  cancelled: "Paiement annulé",
};

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export type OrderStateKey = "to_validate" | "proposed" | "preparing" | "ready" | "shipped" | "done" | "refused" | "cancelled";

/** État unique, lisible, d'une commande (validation + préparation). */
export function orderState(
  validation: ValidationStatus,
  fulfillment: FulfillmentStatus,
): { key: OrderStateKey; label: string } {
  if (validation === "refused") return { key: "refused", label: "Refusée" };
  if (fulfillment === "cancelled") return { key: "cancelled", label: "Annulée" };
  if (validation === "pending") return { key: "to_validate", label: "À valider" };
  // Modification proposée au client : sa réponse est attendue.
  if (validation === "proposed") return { key: "proposed", label: "Proposition envoyée" };
  if (fulfillment === "ready") return { key: "ready", label: "Prête" };
  if (fulfillment === "shipped") return { key: "shipped", label: "Expédiée" };
  if (fulfillment === "delivered") return { key: "done", label: "Terminée" };
  return { key: "preparing", label: "En préparation" };
}

export type OrderSource = "online" | "manual";

export const orderSourceLabels: Record<OrderSource, string> = {
  online: "Demande en ligne",
  manual: "Vente manuelle",
};
