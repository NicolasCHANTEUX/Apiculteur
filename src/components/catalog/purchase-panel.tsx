"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PriceTag } from "@/components/catalog/product-card";
import { formatPrice } from "@/components/catalog/product-display";
import { CartIcon, CircleCheckIcon, MessageCircleIcon, MinusIcon, PlusIcon, SparklesIcon } from "@/components/icons";
import type { PublicProduct } from "@/data/catalog";
import { addToCart, cartSnapshot, parseCart, subscribeCart } from "@/lib/cart/storage";
import { contactHref, productQuestionMessage } from "@/lib/cart/request";
import { calculatePricedLine, formatEuros, nextTierIncentive } from "@/lib/domain/pricing";

/** « essaim » → « essaims » ; les unités composées (« lot de 5 ») restent telles quelles. */
function unitLabel(unit: string, count: number) {
  if (count < 2 || /\s/.test(unit) || /[sxz]$/.test(unit)) return unit;
  return `${unit}s`;
}

export function PurchasePanel({ product }: { product: PublicProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<number | null>(null);
  const [notSaved, setNotSaved] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const cart = parseCart(useSyncExternalStore(subscribeCart, cartSnapshot, () => "[]"));
  const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;

  const priced = product.priceVisibility === "visible";
  const maxQuantity =
    product.stockDisplayMode === "exact" && product.displayedStockQuantity
      ? Math.min(999, product.displayedStockQuantity)
      : 999;
  const unavailable =
    product.stockStatusLabel === "sold_out" ||
    product.stockStatusLabel === "coming_soon" ||
    product.displayedStockQuantity === 0;
  const quote = product.purchaseMode === "quote";
  const line = priced ? calculatePricedLine(product.basePrice, product.pricingTiers, quantity) : null;
  const incentive = priced ? nextTierIncentive(product.basePrice, product.pricingTiers, quantity) : null;
  const activeTier = product.pricingTiers.findIndex(
    (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
  );
  const question = contactHref("Question sur un essaim", productQuestionMessage(product.name, product.sku), { product: product.slug });
  const unit = product.saleUnit || "unité";

  // Barre d'achat fixée en bas sur mobile quand les boutons ne sont plus visibles.
  useEffect(() => {
    const target = actionsRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (added === null) return;
    const timer = window.setTimeout(() => setAdded(null), 4000);
    return () => window.clearTimeout(timer);
  }, [added]);

  function add() {
    setNotSaved(!addToCart(product.id, quantity));
    setAdded(quantity);
  }

  const mainAction = unavailable ? (
    <Link
      href={contactHref("Question sur un essaim", `Bonjour,\n\nPouvez-vous me prévenir lorsque « ${product.name} » sera de nouveau disponible ?\n\n`, { product: product.slug })}
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-espresso px-5 text-[15px] font-semibold text-white transition hover:bg-brown"
    >
      Me prévenir du retour
    </Link>
  ) : quote ? (
    <Link
      href={contactHref("", "", { type: "devis", product: product.slug, quantity })}
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-honey px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark"
    >
      Demander un devis
    </Link>
  ) : (
    <button
      type="button"
      onClick={add}
      className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition ${
        added !== null ? "bg-green-600 hover:bg-green-700" : "bg-honey hover:bg-honey-dark"
      }`}
    >
      {added !== null ? <CircleCheckIcon className="size-5 motion-safe:animate-[pop_.35s_ease-out]" /> : <CartIcon className="size-5" />}
      {added !== null ? "Ajouté au panier" : "Ajouter au panier"}
    </button>
  );

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PriceTag product={product} />
          {line && quantity > 1 ? (
            <p className="text-right text-[13px] text-muted">
              {quantity} × {formatEuros(line.unitPriceCents)} ={" "}
              <span className="text-[17px] font-semibold text-ink">{formatEuros(line.lineTotalCents)}</span>
            </p>
          ) : null}
        </div>

        {priced && product.pricingTiers.length > 1 ? (
          <table className="mt-5 w-full text-left text-[13px]">
            <caption className="sr-only">Tarifs par quantité</caption>
            <thead className="text-[11px] tracking-[0.06em] text-muted uppercase">
              <tr>
                <th className="pb-2 font-medium">Quantité</th>
                <th className="pb-2 text-right font-medium">Prix unitaire</th>
              </tr>
            </thead>
            <tbody className="border-t border-sand">
              {product.pricingTiers.map((tier, index) => {
                const current = index === activeTier;
                return (
                  <tr
                    key={`${tier.minQuantity}-${tier.maxQuantity ?? "plus"}`}
                    className={`border-b border-sand transition-colors last:border-0 ${current ? "bg-honey/10" : ""}`}
                    aria-current={current ? "true" : undefined}
                  >
                    <td className={`py-2.5 pl-2 ${current ? "font-medium text-ink" : "text-body"}`}>
                      <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${current ? "bg-honey" : "bg-transparent"}`} aria-hidden />
                      {tier.maxQuantity === null ? `À partir de ${tier.minQuantity}` : `De ${tier.minQuantity} à ${tier.maxQuantity}`}
                    </td>
                    <td className="py-2.5 pr-2 text-right font-semibold text-ink">{formatPrice(tier.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {!unavailable ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-body" id="quantity-label">
              Quantité
            </span>
            <div className="inline-flex h-11 items-center rounded-xl border border-line bg-cream" role="group" aria-labelledby="quantity-label">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuer la quantité"
                className="flex size-11 items-center justify-center rounded-l-xl text-ink transition hover:bg-sand disabled:opacity-35"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="min-w-12 text-center text-[16px] font-semibold text-ink tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Augmenter la quantité"
                className="flex size-11 items-center justify-center rounded-r-xl text-ink transition hover:bg-sand disabled:opacity-35"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
            <span className="text-[13px] text-muted">{unitLabel(unit, quantity)}</span>
          </div>
        ) : null}

        {incentive && !unavailable ? (
          <button
            type="button"
            onClick={() => setQuantity(incentive.targetQuantity)}
            className="mt-4 flex w-full items-start gap-2.5 rounded-xl bg-honey/10 px-3.5 py-3 text-left text-[13px] leading-[1.45] text-ink ring-1 ring-honey/20 transition hover:bg-honey/15"
          >
            <SparklesIcon className="mt-0.5 size-4 shrink-0 text-honey-dark" />
            <span>
              Plus que <strong className="font-semibold">{incentive.addQuantity}</strong> pour passer à{" "}
              <strong className="font-semibold">{formatEuros(incentive.unitPriceCents)}</strong> l’unité
              <span className="text-muted"> · {formatEuros(incentive.savingPerUnitCents)} d’économie par {unit}</span>
              <span className="mt-0.5 block text-[12px] font-medium text-honey-dark">Passer à {incentive.targetQuantity} →</span>
            </span>
          </button>
        ) : null}

        <div ref={actionsRef} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {mainAction}
          <Link
            href={question}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-[14px] font-medium text-ink transition hover:border-honey/50 hover:bg-cream"
          >
            <MessageCircleIcon className="size-4 text-honey" />
            Poser une question
          </Link>
        </div>

        <div aria-live="polite" className="empty:hidden">
          {added !== null ? (
            <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 px-3.5 py-2.5 text-[13px] text-green-900 motion-safe:animate-[fade-in_.3s_ease-out]">
              <span>
                {added} {unitLabel(unit, added)} ajouté{added > 1 ? "s" : ""} · {inCart} dans votre panier
              </span>
              <Link href="/panier" className="font-semibold underline-offset-2 hover:underline">
                Voir le panier →
              </Link>
            </p>
          ) : inCart > 0 ? (
            <p className="mt-3 text-[12.5px] text-muted">
              Déjà {inCart} dans votre <Link href="/panier" className="text-honey-dark underline-offset-2 hover:underline">panier</Link>.
            </p>
          ) : null}
          {notSaved ? (
            <p className="mt-2 text-[12.5px] text-red-700">Le panier ne sera pas conservé après fermeture du navigateur.</p>
          ) : null}
        </div>

        <p className="mt-4 border-t border-sand pt-4 text-[12.5px] leading-[1.55] text-muted">
          La commande en ligne arrive bientôt. En attendant, votre panier vous permet d’envoyer une demande : je vous réponds
          personnellement pour confirmer la disponibilité, le retrait ou la livraison.
        </p>
      </div>

      {/* Barre d'achat mobile */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-16px_rgb(61_43_26/0.35)] backdrop-blur-md transition-transform duration-300 md:hidden ${
          showBar ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!showBar}
        inert={!showBar}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{product.name}</p>
            <p className="text-[13px] text-muted">
              {line ? (
                <>
                  <span className="font-semibold text-ink">{formatEuros(line.lineTotalCents)}</span>
                  {quantity > 1 ? ` · ${quantity} ${unitLabel(unit, quantity)}` : ""}
                </>
              ) : (
                "Prix sur demande"
              )}
            </p>
          </div>
          <div className="flex min-w-[150px]">{mainAction}</div>
        </div>
      </div>
    </>
  );
}
