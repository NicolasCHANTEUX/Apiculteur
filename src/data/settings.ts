import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";

export type OrderSettings = {
  /** Réception des demandes de commande depuis le site. */
  ordersOpen: boolean;
  /** À partir de cette quantité, la demande est signalée « grande quantité ». */
  quantityThreshold: number;
};

const closed: OrderSettings = { ordersOpen: false, quantityThreshold: 30 };

// Réglages lus avec la clé serveur (app_settings n'est lisible que par les
// admins). Prudence par défaut : en cas d'erreur, les demandes sont fermées
// et le site propose le contact par email.
export const getOrderSettings = cache(async (): Promise<OrderSettings> => {
  if (!getPublicSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return closed;
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("key, value")
    .in("key", ["orders_open", "manual_validation_quantity_threshold"]);
  if (error) {
    console.error("Réglages des commandes", error.code, error.message);
    return closed;
  }
  const value = (key: string) => data?.find((row) => row.key === key)?.value;
  const threshold = Number(value("manual_validation_quantity_threshold"));
  return {
    ordersOpen: value("orders_open") === true,
    quantityThreshold: Number.isInteger(threshold) && threshold > 0 ? threshold : closed.quantityThreshold,
  };
});
