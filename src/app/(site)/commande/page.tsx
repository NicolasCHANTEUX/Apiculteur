import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { OrderRequestForm } from "@/components/order/order-request-form";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { Eyebrow, container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getActiveZones } from "@/data/delivery";
import { readPublishedLegal } from "@/data/legal";
import { getDeliverySettings, getOrderSettings } from "@/data/settings";
import { pickupAddress } from "@/lib/delivery/settings";
import { parisDay } from "@/lib/admin/series";

export const metadata: Metadata = { title: "Ma demande de commande", robots: { index: false, follow: false } };

export default async function OrderPage() {
  // Catalogue, prix et ouverture des demandes lus à chaque visite.
  await connection();
  const [catalog, settings, legalReading, zones, delivery] = await Promise.all([
    getPublicCatalog(),
    getOrderSettings(),
    readPublishedLegal(),
    getActiveZones(),
    getDeliverySettings(),
  ]);
  const legal = legalReading.status === "published" ? legalReading.legal : null;

  return (
    <main className={`${container} flex-1 pt-12 pb-24`}>
      <Eyebrow>Demande de commande</Eyebrow>
      <h1 className="mt-3 font-display text-[34px] leading-tight font-medium text-ink">Finaliser ma demande</h1>
      <p className="mt-2 mb-8 max-w-[620px] text-[14.5px] leading-[1.6] text-muted">
        Votre demande est étudiée personnellement : je vous recontacte pour confirmer la disponibilité, le retrait ou la
        livraison, et les modalités de paiement.
      </p>

      {!settings.ordersOpen ? (
        <div className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-honey/12 text-honey">
            <ClockIcon className="size-7" />
          </span>
          <h2 className="mt-5 font-display text-[24px] font-medium text-ink">Les demandes en ligne ouvrent bientôt</h2>
          <p className="mt-2 max-w-[440px] text-[14px] text-muted">
            En attendant, envoyez le contenu de votre panier par message depuis la page panier : je vous réponds
            personnellement.
          </p>
          <Link href="/panier" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-honey px-6 text-[15px] font-semibold text-white transition hover:bg-honey-dark">
            Retour au panier
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      ) : legalReading.status === "unavailable" ? (
        // CGV illisibles pour le moment : pas de demande sans leur acceptation.
        <div role="status" className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-honey/12 text-honey">
            <ClockIcon className="size-7" />
          </span>
          <h2 className="mt-5 font-display text-[24px] font-medium text-ink">Un instant, s’il vous plaît</h2>
          <p className="mt-2 max-w-[440px] text-[14px] text-muted">
            Les conditions générales de vente ne peuvent pas être affichées pour le moment, et elles sont nécessaires pour
            envoyer votre demande. Réessayez dans quelques minutes : votre panier est conservé.
          </p>
          <Link href="/commande" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-honey px-6 text-[15px] font-semibold text-white transition hover:bg-honey-dark">
            Réessayer
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      ) : catalog.kind === "ready" ? (
        <OrderRequestForm products={catalog.products} today={parisDay(new Date())} termsVersion={legal?.version ?? null}
          zones={zones}
          pickup={{ city: delivery.origin?.city ?? null, address: pickupAddress(delivery, "site"), instructions: delivery.pickupInstructions }}
        />
      ) : (
        <p className="rounded-xl border border-line bg-white p-6 text-[14px] text-body">Le catalogue n’est pas encore configuré.</p>
      )}
    </main>
  );
}
