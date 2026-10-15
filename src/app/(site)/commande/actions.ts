"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getPublicCatalog } from "@/data/catalog";
import { assessDelivery, type DeliveryAssessment } from "@/data/delivery";
import { scheduleOrderEmails } from "@/data/email";
import { readPublishedLegal, termsState } from "@/data/legal";
import { getOrderSettings } from "@/data/settings";
import { parisDay } from "@/lib/admin/series";
import { checkTermsAcceptance } from "@/lib/legal/terms";
import { parseCart } from "@/lib/cart/storage";
import { centsToDecimal } from "@/lib/catalog/product-form";
import { parseOrderContact, priceRequest, reviewReasons } from "@/lib/orders/request";
import { RateLimitError, currentClientIp, enforceRateLimit } from "@/lib/security/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderRequestState = {
  status: "idle" | "error";
  message: string;
  errors: Record<string, string>;
  /** Changements du panier qui empêchent l'envoi (produit épuisé…). */
  problems: string[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNAVAILABLE = "L’envoi est momentanément impossible. Réessayez dans un instant, ou écrivez-moi depuis la page contact.";

function failure(message: string, extra: Partial<OrderRequestState> = {}): OrderRequestState {
  return { status: "error", message, errors: {}, problems: [], ...extra };
}

// Demande de commande (ROADMAP lot 4). Les prix et la disponibilité sont
// recalculés depuis le catalogue : rien de ce que le navigateur envoie n'est
// repris tel quel, hormis les identifiants et quantités du panier.
export async function submitOrderRequestAction(
  _previous: OrderRequestState,
  formData: FormData,
): Promise<OrderRequestState> {
  // Champ piège invisible : un robot qui le remplit croit avoir réussi.
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.trim()) redirect("/commande/merci");

  const settings = await getOrderSettings();
  if (!settings.ordersOpen) {
    return failure("La réception des demandes en ligne est fermée pour le moment. Écrivez-moi depuis la page contact.");
  }

  // CGV publiées : acceptation obligatoire, de la version en vigueur. Si
  // on ne peut pas savoir lesquelles sont publiées, l'envoi attend.
  const terms = checkTermsAcceptance(termsState(await readPublishedLegal()), {
    termsVersion: formData.get("termsVersion"),
    accepted: formData.get("terms") === "on",
  });
  if (!terms.ok && terms.reason === "unavailable") {
    return failure("Les conditions générales de vente ne peuvent pas être vérifiées pour le moment : réessayez dans un instant. Votre panier est conservé.");
  }
  if (!terms.ok && terms.reason === "changed") {
    // La page se recharge avec la version en vigueur des CGV.
    refresh();
    return failure("Les conditions générales de vente ont été mises à jour : relisez-les, cochez la case, puis renvoyez votre demande.", { errors: { terms: "Nouvelle version des CGV." } });
  }
  const parsed = parseOrderContact(formData, parisDay(new Date()));
  if (!parsed.ok || !terms.ok) {
    const errors = { ...(parsed.ok ? {} : parsed.errors), ...(terms.ok ? {} : { terms: "Acceptez les conditions générales de vente pour envoyer votre demande." }) };
    return failure("Certains champs sont à corriger.", { errors });
  }
  const contact = parsed.value;

  const key = formData.get("submissionKey");
  if (typeof key !== "string" || !UUID.test(key)) return failure(UNAVAILABLE);
  const raw = formData.get("items");
  const items = parseCart(typeof raw === "string" ? raw : "[]");
  if (items.length === 0) return failure("Votre panier est vide.");
  if (items.length > 30) return failure("Trop de produits différents dans une même demande : écrivez-moi directement.");

  try {
    const ip = await currentClientIp();
    await enforceRateLimit({ scope: "order-request-ip", identifier: ip, limit: 5, windowSeconds: 3600 });
    await enforceRateLimit({ scope: "order-request", identifier: `${ip}|${contact.email}`, limit: 3, windowSeconds: 3600 });
  } catch (error) {
    if (error instanceof RateLimitError) return failure("Plusieurs demandes viennent d’être envoyées : patientez un peu avant de réessayer.");
    console.error("Demande de commande : limitation indisponible", error);
    return failure(UNAVAILABLE);
  }

  let catalog;
  try {
    catalog = await getPublicCatalog();
  } catch (error) {
    console.error("Demande de commande : catalogue indisponible", error);
    return failure(UNAVAILABLE);
  }
  if (catalog.kind !== "ready") return failure(UNAVAILABLE);

  const priced = priceRequest(items, catalog.products);
  if (priced.problems.length) {
    return failure("Votre panier a changé depuis votre visite : vérifiez-le avant d’envoyer la demande.", { problems: priced.problems });
  }

  // Livraison : produits à retirer sur place, puis adresse localisée,
  // distance, zone et frais estimés (confirmés à l'acceptation).
  let delivery: DeliveryAssessment | null = null;
  if (contact.deliveryMethod === "delivery") {
    const pickupOnly = priced.lines.filter((line) => line.product.deliveryMode === "pickup_only").map((line) => `« ${line.product.name} »`);
    if (pickupOnly.length) {
      return failure("Certains produits ne se livrent pas.", {
        errors: { deliveryMethod: `${pickupOnly.join(", ")} ${pickupOnly.length > 1 ? "sont" : "est"} à retirer sur l’exploitation : choisissez le retrait.` },
      });
    }
    delivery = await assessDelivery({
      address: { line1: contact.addressLine1, postalCode: contact.postalCode, city: contact.city },
      lines: priced.lines.map((line) => ({ name: line.product.name, quantity: line.quantity, deliveryMode: line.product.deliveryMode })),
    });
  }
  const feeCents = delivery?.quote.kind === "zone" ? delivery.quote.feeCents : 0;

  const { data, error } = await createAdminClient()
    .rpc("submit_order_request", {
      p_request: {
        submission_key: key,
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
        company_name: contact.companyName,
        professional_id: contact.professionalId,
        delivery_method: contact.deliveryMethod,
        address_line1: contact.addressLine1,
        postal_code: contact.postalCode,
        city: contact.city,
        requested_date: contact.requestedDate,
        message: contact.message,
        subtotal: centsToDecimal(priced.subtotalCents),
        review_reasons: reviewReasons(priced, contact.deliveryMethod, settings.quantityThreshold, delivery?.reasons),
        // Enregistrés dans la même transaction que la demande : CGV
        // acceptées, livraison évaluée (frais confirmés à l'acceptation).
        terms_version: terms.version,
        delivery_fee: centsToDecimal(feeCents),
        delivery_distance_km: delivery?.distanceKm ?? null,
        delivery_zone_id: delivery?.quote.kind === "zone" ? delivery.quote.zone.id : null,
        delivery_latitude: delivery?.geocoded?.lat ?? null,
        delivery_longitude: delivery?.geocoded?.lng ?? null,
        items: priced.lines.map((line) => ({
          product_id: line.product.id,
          name: line.product.name,
          unit_price: centsToDecimal(line.unitPriceCents ?? 0),
          quantity: line.quantity,
          line_total: centsToDecimal(line.lineTotalCents ?? 0),
        })),
      },
    })
    .single<{ order_id: string; order_number: string; already_submitted: boolean }>();

  if (error || !data) {
    // CGV publiées entre-temps : la base refuse la demande (voir la
    // migration 20261021100000_order_terms.sql) ; la page se recharge.
    if (error?.code === "22023" && error.message.includes("CGV")) {
      refresh();
      return failure("Les conditions générales de vente ont été mises à jour : relisez-les, cochez la case, puis renvoyez votre demande.", { errors: { terms: "Nouvelle version des CGV." } });
    }
    console.error("Demande de commande", error?.code, error?.message);
    return failure(UNAVAILABLE);
  }

  if (!data.already_submitted) {
    // Accusé de réception au client et alerte à l'apiculteur, envoyés après
    // la réponse (une demande rejouée ne renvoie rien).
    await scheduleOrderEmails(data.order_id, ["order_received", "order_new_admin"]);
  }

  redirect(`/commande/merci?numero=${encodeURIComponent(data.order_number)}`);
}
