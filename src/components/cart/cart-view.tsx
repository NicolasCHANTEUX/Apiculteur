"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AvailabilityPill, ProductCard } from "@/components/catalog/product-card";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CartIcon,
  CircleCheckIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
} from "@/components/icons";
import type { PublicProduct } from "@/data/catalog";
import { cartSnapshot, parseCart, subscribeCart, writeCart } from "@/lib/cart/storage";
import { cartRequestMessage, contactHref } from "@/lib/cart/request";
import { calculatePricedLine, formatEuros, nextTierIncentive } from "@/lib/domain/pricing";

function isUnavailable(product: PublicProduct) {
  return product.stockStatusLabel === "sold_out" || product.stockStatusLabel === "coming_soon" || product.displayedStockQuantity === 0;
}

// Avec la réception des demandes ouverte, « Envoyer ma demande » mène au
// formulaire de commande ; sinon, à un message pré-rempli (page contact).
export function CartView({ products, ordersOpen }: { products: PublicProduct[]; ordersOpen: boolean }) {
  const [notSaved, setNotSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const snapshot = useSyncExternalStore(subscribeCart, cartSnapshot, () => "[]");
  const items = parseCart(snapshot);
  const byId = new Map(products.map((product) => [product.id, product]));
  const rows = items.map((item) => {
    const product = byId.get(item.id);
    const line = product && product.priceVisibility === "visible"
      ? calculatePricedLine(product.basePrice, product.pricingTiers, item.quantity)
      : null;
    return { item, product, line };
  });
  const total = rows.reduce((sum, row) => sum + (row.line?.lineTotalCents ?? 0), 0);
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const toConfirm = rows.filter((row) => row.product && !row.line).length;
  const problems = rows.filter((row) => !row.product || isUnavailable(row.product)).length;

  function change(id: string, quantity: number) {
    // La ligne garde sa place dans le panier.
    const next = items
      .map((item) => (item.id === id ? { ...item, quantity } : item))
      .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 999);
    setNotSaved(!writeCart(next));
  }

  if (items.length === 0) {
    const suggestions = [...products].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
    return (
      <div className="space-y-12">
        <div className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgb(61_43_26/0.06)]">
          <span className="relative flex size-20 items-center justify-center rounded-full bg-honey/12 text-honey">
            <span className="absolute inset-0 rounded-full bg-honey/10 motion-safe:animate-ping [animation-duration:2.5s]" aria-hidden />
            <CartIcon className="size-8" />
          </span>
          <h2 className="mt-6 font-display text-[26px] font-medium text-ink">Votre panier est vide</h2>
          <p className="mt-2 max-w-[420px] text-[14.5px] leading-[1.6] text-muted">
            Parcourez les essaims et reines disponibles, ajoutez ceux qui vous intéressent, puis envoyez votre demande en un clic.
          </p>
          <Link
            href="/catalogue"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-honey px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark"
          >
            Découvrir nos essaims
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        {suggestions.length ? (
          <section>
            <h2 className="font-display text-[24px] font-medium text-ink">Pour bien commencer</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const request = ordersOpen ? "/commande" : contactHref(
    "Commande ou réservation",
    cartRequestMessage(
      rows
        .filter((row): row is typeof row & { product: PublicProduct } => Boolean(row.product))
        .map(({ item, product, line }) => ({
          name: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPriceCents: line?.unitPriceCents ?? null,
        })),
    ),
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
      <section aria-label="Articles du panier" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">
            {units} article{units > 1 ? "s" : ""} · {items.length} produit{items.length > 1 ? "s" : ""}
          </p>
          {confirmClear ? (
            <p className="flex items-center gap-3 text-[13px]" role="alert">
              Vider tout le panier ?
              <button type="button" onClick={() => { setNotSaved(!writeCart([])); setConfirmClear(false); }} className="font-semibold text-red-700 hover:underline">
                Oui, vider
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="text-muted hover:text-ink">
                Annuler
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="text-[13px] text-muted transition hover:text-red-700">
              Vider le panier
            </button>
          )}
        </div>

        {notSaved ? (
          <p role="status" className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-[13.5px] text-orange-900">
            Le navigateur ne permet pas de conserver ce panier : il risque de disparaître à la fermeture de la page.
          </p>
        ) : null}

        <ul className="space-y-3">
          {rows.map(({ item, product, line }) => {
            if (!product) {
              return (
                <li key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-5 text-[14px]">
                  <span className="flex items-center gap-2 text-red-800">
                    <AlertTriangleIcon className="size-4" />
                    Ce produit n’est plus proposé dans le catalogue.
                  </span>
                  <button type="button" onClick={() => change(item.id, 0)} className="font-medium text-red-800 hover:underline">
                    Retirer
                  </button>
                </li>
              );
            }
            const image = product.images[0];
            const unavailable = isUnavailable(product);
            const incentive = line ? nextTierIncentive(product.basePrice, product.pricingTiers, item.quantity) : null;
            const max = product.stockDisplayMode === "exact" && product.displayedStockQuantity ? Math.min(999, product.displayedStockQuantity) : 999;
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgb(61_43_26/0.05)] transition sm:p-5 ${unavailable ? "border-red-200" : "border-line"}`}
              >
                <div className="flex gap-4">
                  <Link href={`/produits/${product.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.url} alt={image.altText ?? product.name} className="size-full object-cover transition duration-500 hover:scale-105" />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/produits/${product.slug}`} className="font-display text-[17px] leading-snug font-semibold text-ink transition hover:text-honey-dark">
                        {product.name}
                      </Link>
                      {product.tagline || product.category ? (
                        <p className="mt-0.5 text-[12.5px] text-honey">{product.tagline ?? product.category?.name}</p>
                      ) : null}
                      <div className="mt-2">
                        <AvailabilityPill product={product} />
                      </div>
                      <p className="mt-2 text-[12.5px] text-muted">
                        {line ? `${formatEuros(line.unitPriceCents)} l’unité` : "Prix à confirmer avec l’apiculteur"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="text-[17px] font-semibold text-ink tabular-nums">{line ? formatEuros(line.lineTotalCents) : "—"}</p>
                      <div className="inline-flex h-10 items-center rounded-xl border border-line bg-cream" role="group" aria-label={`Quantité de ${product.name}`}>
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => change(item.id, item.quantity - 1)}
                          aria-label={`Diminuer la quantité de ${product.name}`}
                          className="flex size-10 items-center justify-center rounded-l-xl transition hover:bg-sand disabled:opacity-35"
                        >
                          <MinusIcon className="size-3.5" />
                        </button>
                        <span className="min-w-9 text-center text-[15px] font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= max}
                          onClick={() => change(item.id, item.quantity + 1)}
                          aria-label={`Augmenter la quantité de ${product.name}`}
                          className="flex size-10 items-center justify-center rounded-r-xl transition hover:bg-sand disabled:opacity-35"
                        >
                          <PlusIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => change(item.id, 0)}
                    aria-label={`Retirer ${product.name} du panier`}
                    title="Retirer"
                    className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center self-start rounded-full text-muted transition hover:bg-sand hover:text-ink"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                </div>

                {unavailable ? (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                    <AlertTriangleIcon className="size-4 shrink-0" />
                    Ce produit n’est plus disponible pour le moment : retirez-le pour envoyer votre demande.
                  </p>
                ) : incentive ? (
                  <button
                    type="button"
                    onClick={() => change(item.id, incentive.targetQuantity)}
                    className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-honey/10 px-3.5 py-2.5 text-left text-[13px] text-ink ring-1 ring-honey/20 transition hover:bg-honey/15"
                  >
                    <SparklesIcon className="size-4 shrink-0 text-honey-dark" />
                    <span className="flex-1">
                      Ajoutez-en <strong className="font-semibold">{incentive.addQuantity}</strong> pour passer à{" "}
                      <strong className="font-semibold">{formatEuros(incentive.unitPriceCents)}</strong> l’unité
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-honey-dark">+{incentive.addQuantity}</span>
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]" aria-label="Récapitulatif">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-28px_rgb(61_43_26/0.5)]">
          <div className="bg-espresso px-6 py-5 text-white">
            <p className="text-[12px] tracking-[0.08em] text-white/60 uppercase">Total estimé</p>
            <p className="mt-1 text-[32px] leading-none font-semibold">{formatEuros(total)}</p>
            {toConfirm ? (
              <p className="mt-2 text-[12.5px] text-[#f6d27a]">
                + {toConfirm} produit{toConfirm > 1 ? "s" : ""} au prix à confirmer
              </p>
            ) : null}
          </div>
          <div className="space-y-4 p-6">
            <dl className="space-y-2 text-[13.5px]">
              {rows.filter((row) => row.product).map(({ item, product, line }) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <dt className="min-w-0 truncate text-body">
                    {item.quantity} × {product?.name}
                  </dt>
                  <dd className="shrink-0 font-medium text-ink tabular-nums">{line ? formatEuros(line.lineTotalCents) : "à confirmer"}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand pt-2 text-muted">
                <dt>Retrait ou livraison</dt>
                <dd>à convenir</dd>
              </div>
            </dl>

            {problems ? (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800" role="status">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                Retirez les produits indisponibles pour envoyer votre demande.
              </p>
            ) : null}

            {problems ? (
              <span className="flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-line text-[15px] font-semibold text-muted" aria-disabled="true">
                Envoyer ma demande
              </span>
            ) : (
              <Link
                href={request}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-honey text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark"
              >
                Envoyer ma demande
                <ArrowRightIcon className="size-4" />
              </Link>
            )}
            <Link href="/catalogue" className="block text-center text-[13.5px] font-medium text-honey-dark hover:underline">
              Continuer mes achats
            </Link>

            <ul className="space-y-2 border-t border-sand pt-4 text-[12.5px] text-body">
              {[
                "Aucun paiement en ligne à cette étape",
                "Disponibilité confirmée personnellement par l’apiculteur",
                "Retrait ou livraison organisés ensemble",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <CircleCheckIcon className="mt-px size-4 shrink-0 text-sage" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
