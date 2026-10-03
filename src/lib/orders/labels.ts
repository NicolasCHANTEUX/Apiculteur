// Libellés des statuts de commande (enums de supabase/migrations/
// 20260921120200_customers_orders.sql).

export type FulfillmentStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";
export type ValidationStatus = "not_required" | "pending" | "accepted" | "refused";
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
