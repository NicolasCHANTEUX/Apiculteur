import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/components/catalog/product-display";
import { MapPinIcon, MessageCircleIcon, TruckIcon } from "@/components/icons";
import { PageIntro, buttonStyles } from "@/components/ui";
import { getActiveZones } from "@/data/delivery";
import { getDeliverySettings } from "@/data/settings";
import { pickupAddress } from "@/lib/delivery/settings";

export const metadata: Metadata = {
  title: "Livraison",
  description: "Retrait sur l’exploitation, zones et tarifs de livraison des essaims et du matériel.",
};

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-8">
      <h2 className="flex items-center gap-3 font-display text-[21px] font-medium text-ink">
        <span className="flex size-9 items-center justify-center rounded-lg bg-honey/15 text-honey">{icon}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[14.5px] leading-[1.7] text-body">{children}</div>
    </section>
  );
}

// Page générée depuis les réglages de livraison de l'admin (CAHIER §9) :
// jamais d'adresse fictive, tarifs des zones actives seulement.
export default async function LivraisonPage() {
  const [settings, zones] = await Promise.all([getDeliverySettings(), getActiveZones()]);
  const address = pickupAddress(settings, "site");
  const city = settings.origin?.city;

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-6 pb-24">
      <PageIntro eyebrow="Informations" title="Livraison et retrait" subtitle="Les abeilles voyagent peu et bien : voici comment récupérer votre commande." />
      <div className="space-y-5">
        <Section icon={<MapPinIcon className="size-5" />} title="Retrait sur l’exploitation">
          <p>
            Gratuit, sur rendez-vous convenu ensemble{city ? `, à ${city}` : ""}.
            {address ? ` Adresse : ${address}.` : settings.pickupMode === "after_acceptance" ? " L’adresse exacte vous est communiquée à l’acceptation de votre commande." : ""}
          </p>
          {settings.pickupInstructions ? <p>{settings.pickupInstructions}</p> : null}
        </Section>

        <Section icon={<TruckIcon className="size-5" />} title="Livraison">
          {zones.length ? (
            <>
              <p>Tarifs TTC, confirmés à l’acceptation de votre commande. Hors de ces zones, la livraison est étudiée au cas par cas, sur devis.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-[12px] tracking-[0.06em] text-muted uppercase">
                      <th className="py-2 pr-4 font-medium">Zone</th>
                      <th className="py-2 pr-4 font-medium">Secteur</th>
                      <th className="py-2 font-medium">Tarif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone) => (
                      <tr key={zone.id} className="border-b border-line/60 align-top">
                        <td className="py-2.5 pr-4 font-medium text-ink">{zone.name}</td>
                        <td className="py-2.5 pr-4">
                          {zone.includePrefixes.length ? `Codes postaux ${zone.includePrefixes.join(", ")}` : "France"}
                          {zone.excludePrefixes.length ? `, sauf ${zone.excludePrefixes.join(", ")}` : ""}
                          {zone.maxDistanceKm ? `, jusqu’à ${zone.maxDistanceKm} km` : ""}
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          {formatPrice(zone.feeCents / 100)}
                          {zone.extraUnitFeeCents ? <span className="block text-[12.5px] text-muted">+ {formatPrice(zone.extraUnitFeeCents / 100)} par unité supplémentaire</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>La livraison s’organise au cas par cas : indiquez votre adresse dans votre demande, je vous propose une solution et son tarif avant toute confirmation.</p>
          )}
          <p className="text-[13.5px] text-muted">La Corse et l’outre-mer sont étudiés sur devis. Certains produits sont à retirer sur place : c’est indiqué sur leur fiche.</p>
        </Section>

        {settings.transportNote ? (
          <Section icon={<TruckIcon className="size-5" />} title="Le transport des abeilles">
            {settings.transportNote.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </Section>
        ) : null}

        <div className="flex justify-center pt-4">
          <Link href="/contact" className={buttonStyles.primary}>
            <MessageCircleIcon className="size-4" />
            Une question sur la livraison ?
          </Link>
        </div>
      </div>
    </main>
  );
}
