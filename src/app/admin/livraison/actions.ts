"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { centsToDecimal } from "@/lib/catalog/product-form";
import { geocodeFrenchAddress } from "@/lib/delivery/geocode";
import { parseZoneForm } from "@/lib/delivery/zone-form";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Le formulaire de commande, la page Livraison et les emails lisent ces réglages.
function revalidateDelivery() {
  revalidatePath("/admin/livraison");
  revalidatePath("/livraison");
  revalidatePath("/commande");
}

async function saveSetting(key: string, value: unknown, description: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({ key, value, description });
  if (error) console.error(`Réglage ${key}`, error.code, error.message);
  return !error;
}

/** Adresse de l'exploitation, point de départ des distances (localisée automatiquement). */
export async function saveOriginAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/livraison");
  const line1 = field(formData, "line1", 200);
  const postalCode = field(formData, "postalCode", 5).replace(/\s/g, "");
  const city = field(formData, "city", 100);
  if (!/^\d{5}$/.test(postalCode) || city.length < 2) return failure("Indiquez au moins le code postal et la commune de l’exploitation.");

  const geocoded = await geocodeFrenchAddress({ line1, postalCode, city }).catch(() => null);
  const saved = await saveSetting(
    "delivery_origin_address",
    {
      line1,
      postal_code: postalCode,
      city,
      country: "FR",
      latitude: geocoded?.lat ?? null,
      longitude: geocoded?.lng ?? null,
      label: geocoded?.label ?? "",
    },
    "Adresse de depart de l'apiculteur, utilisee pour calculer la distance de livraison.",
  );
  if (!saved) return failure("L’adresse n’a pas pu être enregistrée.");
  await recordAudit({ actorUserId: admin.userId, action: "delivery.origin_saved", entityType: "settings", entityId: null, metadata: { located: Boolean(geocoded) } });
  revalidateDelivery();
  if (!geocoded) return failure("Adresse enregistrée, mais introuvable dans la Base Adresse Nationale : les distances ne seront pas calculées. Vérifiez-la.");
  return success(
    geocoded.precision === "address"
      ? `Exploitation localisée : ${geocoded.label}.`
      : `Commune localisée (${geocoded.label}) : l’adresse exacte n’a pas été reconnue, la distance sera approximative.`,
  );
}

export async function savePickupAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/livraison");
  const mode = field(formData, "pickupMode", 30);
  const value = {
    pickupMode: mode === "public" || mode === "on_request" ? mode : "after_acceptance",
    pickupInstructions: field(formData, "pickupInstructions", 600),
    transportNote: field(formData, "transportNote", 2000),
  };
  const saved = await saveSetting("delivery_settings", value, "Retrait et conditions de transport des essaims.");
  if (!saved) return failure("Les réglages n’ont pas pu être enregistrés.");
  await recordAudit({ actorUserId: admin.userId, action: "delivery.settings_saved", entityType: "settings", entityId: null, metadata: { pickupMode: value.pickupMode } });
  revalidateDelivery();
  return success("Retrait et transport enregistrés.");
}

export async function saveThresholdsAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/livraison");
  const numbers = ["autoKm", "manualKm", "quantity"].map((name) => Number(field(formData, name, 6)));
  const [autoKm, manualKm, quantity] = numbers;
  if (numbers.some((value) => !Number.isInteger(value) || value < 1 || value > 5000)) return failure("Indiquez des nombres entiers positifs.");
  if (autoKm > manualKm) return failure("La distance « éloignée » doit être inférieure ou égale à la « très longue distance ».");

  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert([
    { key: "max_auto_delivery_distance_km", value: autoKm, description: "Au-dela de cette distance (km), une livraison est signalee comme eloignee." },
    { key: "manual_validation_distance_threshold_km", value: manualKm, description: "Au-dela de cette distance (km), une livraison est signalee comme tres longue distance." },
    { key: "manual_validation_quantity_threshold", value: quantity, description: "A partir de cette quantite, une demande est signalee grande quantite." },
  ]);
  if (error) {
    console.error("Seuils", error.code, error.message);
    return failure("Les seuils n’ont pas pu être enregistrés.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "delivery.thresholds_saved", entityType: "settings", entityId: null, metadata: { autoKm, manualKm, quantity } });
  revalidateDelivery();
  return success("Seuils enregistrés.");
}

export async function saveZoneAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/livraison");
  const id = field(formData, "id", 40);
  if (id && !UUID.test(id)) return failure("Zone invalide.");
  const parsed = parseZoneForm(formData);
  if (!parsed.ok) return failure(Object.values(parsed.errors)[0]);
  const zone = parsed.value;
  const row = {
    name: zone.name,
    active: zone.active,
    countries: zone.countries,
    include_prefixes: zone.includePrefixes,
    exclude_prefixes: zone.excludePrefixes,
    fee: centsToDecimal(zone.feeCents),
    extra_unit_fee: centsToDecimal(zone.extraUnitFeeCents),
    max_distance_km: zone.maxDistanceKm,
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("delivery_zones").update(row).eq("id", id).select("id")
    : await supabase.from("delivery_zones").insert({ ...row, display_order: Number(field(formData, "displayOrder", 4)) || 0 }).select("id");
  if (error || !data?.length) {
    if (error) console.error("Zone de livraison", error.code, error.message);
    return failure("La zone n’a pas pu être enregistrée.");
  }
  await recordAudit({ actorUserId: admin.userId, action: id ? "delivery.zone_updated" : "delivery.zone_created", entityType: "settings", entityId: null, metadata: { name: zone.name, active: zone.active } });
  revalidateDelivery();
  return success(id ? `Zone « ${zone.name} » enregistrée.` : `Zone « ${zone.name} » créée${zone.active ? "" : " (désactivée)"}.`);
}

export async function deleteZoneAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/livraison");
  const id = field(formData, "id", 40);
  if (!UUID.test(id)) return failure("Zone invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("delivery_zones").delete().eq("id", id).select("name");
  if (error || !data?.length) return failure("La zone n’a pas pu être supprimée.");
  await recordAudit({ actorUserId: admin.userId, action: "delivery.zone_deleted", entityType: "settings", entityId: null, metadata: { name: data[0].name } });
  revalidateDelivery();
  return success("Zone supprimée. Les commandes passées gardent leurs frais.");
}
