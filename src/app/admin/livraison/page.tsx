import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader, Panel } from "@/components/admin/admin-ui";
import { NewZone, OriginForm, PickupForm, ThresholdsForm, ZoneForm } from "@/components/admin/delivery/delivery-forms";
import { formatPrice } from "@/components/catalog/product-display";
import { ExternalLinkIcon, MapPinIcon } from "@/components/icons";
import { requireAdmin } from "@/data/auth";
import { ZONE_COLUMNS, toZone } from "@/data/delivery";
import { getDeliverySettings, getOrderSettings } from "@/data/settings";
import type { DeliveryZone } from "@/lib/delivery/rules";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Livraison" };

function zoneSummary(zone: DeliveryZone) {
  const area = zone.includePrefixes.length ? `codes ${zone.includePrefixes.join(", ")}` : zone.countries.join(", ") === "FR" ? "toute la France" : zone.countries.join(", ");
  const except = zone.excludePrefixes.length ? `, sauf ${zone.excludePrefixes.join(", ")}` : "";
  const distance = zone.maxDistanceKm ? `, jusqu’à ${zone.maxDistanceKm} km` : "";
  const fee = zone.feeCents ? `${formatPrice(zone.feeCents / 100)}${zone.extraUnitFeeCents ? ` + ${formatPrice(zone.extraUnitFeeCents / 100)} par unité supplémentaire` : ""}` : "sans tarif";
  return `${area}${except}${distance} · ${fee}`;
}

export default async function AdminDeliveryPage() {
  await requireAdmin("/admin/livraison");
  const supabase = await createClient();
  const [settings, orderSettings, zonesResult] = await Promise.all([
    getDeliverySettings(),
    getOrderSettings(),
    supabase.from("delivery_zones").select(`${ZONE_COLUMNS}, display_order`).order("display_order").order("name"),
  ]);
  const missingTable = zonesResult.error && (zonesResult.error.code === "PGRST205" || zonesResult.error.code === "42P01");
  if (zonesResult.error && !missingTable) throw new Error(`Zones: ${zonesResult.error.message}`);
  const zones = (zonesResult.data ?? []).map((row) => toZone(row as Parameters<typeof toZone>[0]));
  const origin = settings.origin;
  const located = origin?.latitude != null && origin.longitude != null;

  return (
    <main className="space-y-6">
      <PageHeader
        title="Livraison"
        description="Retrait sur l’exploitation, zones et tarifs de livraison, et distances à partir desquelles une demande mérite votre attention."
        actions={
          <Link href="/livraison" target="_blank" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-honey-dark hover:underline">
            Voir la page Livraison
            <ExternalLinkIcon className="size-3.5" />
          </Link>
        }
      />

      {missingTable ? (
        <Notice tone="warning">
          Appliquez la migration <code className="rounded bg-orange-100 px-1">20261018100000_delivery.sql</code> dans l’éditeur SQL de Supabase pour
          gérer les zones de livraison.
        </Notice>
      ) : null}

      <Panel title="Exploitation" description="Point de départ des distances, localisé avec la Base Adresse Nationale.">
        <div className="space-y-4">
          <p
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${located ? "bg-green-50 text-green-900" : "bg-orange-50 text-orange-900"}`}
          >
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
            {located ? (
              <span>
                Localisée : {origin?.label || `${origin?.postalCode} ${origin?.city}`}.{" "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${origin?.latitude}&mlon=${origin?.longitude}#map=13/${origin?.latitude}/${origin?.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Voir sur la carte
                </a>
              </span>
            ) : (
              <span>Non localisée : les distances ne sont pas calculées et les zones limitées en distance ne s’appliquent pas.</span>
            )}
          </p>
          <OriginForm origin={origin} />
        </div>
      </Panel>

      <Panel title="Retrait et transport">
        <PickupForm settings={settings} />
      </Panel>

      <Panel
        title="Zones de livraison"
        description="Un tarif n’est proposé que si tous les produits sont livrables et qu’une zone active correspond ; sinon la livraison est sur devis. Pas de livraison gratuite automatique."
      >
        {missingTable ? null : (
          <div className="space-y-4">
            {zones.length === 0 ? <p className="text-[13.5px] text-muted">Aucune zone : la livraison est toujours sur devis.</p> : null}
            {zones.map((zone) => (
              <details key={zone.id} className="group rounded-xl border border-line/80">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 marker:hidden">
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{zone.name}</span>
                    <span className="block text-[12.5px] text-muted">{zoneSummary(zone)}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ring-inset ${
                      zone.active ? "bg-green-50 text-green-800 ring-green-200" : "bg-sand text-muted ring-line"
                    }`}
                  >
                    {zone.active ? "Active" : "Désactivée"}
                  </span>
                </summary>
                <div className="border-t border-line/60 p-4">
                  <ZoneForm key={JSON.stringify(zone)} zone={zone} />
                </div>
              </details>
            ))}
            <NewZone />
          </div>
        )}
      </Panel>

      <Panel title="Seuils d’attention" description="Une demande n’est jamais bloquée : ces seuils la signalent pour que vous l’étudiiez de près.">
        <ThresholdsForm autoKm={settings.autoKm} manualKm={settings.manualKm} quantity={orderSettings.quantityThreshold} />
      </Panel>
    </main>
  );
}
