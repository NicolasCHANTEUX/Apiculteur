"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { PublicProduct } from "@/data/catalog";
import { calculatePricedLine, formatEuros } from "@/lib/domain/pricing";
import { cartSnapshot, parseCart, subscribeCart, writeCart } from "@/lib/cart/storage";

export function CartView({ products }: { products: PublicProduct[] }) {
  const snapshot = useSyncExternalStore(subscribeCart, cartSnapshot, () => "[]");
  const items = parseCart(snapshot);
  const byId = new Map(products.map((product) => [product.id, product]));
  const rows = items.map((item) => ({ item, product: byId.get(item.id) }));
  const total = rows.reduce((sum, { item, product }) => {
    if (!product || product.priceVisibility !== "visible") return sum;
    return sum + calculatePricedLine(product.basePrice, product.pricingTiers, item.quantity).lineTotalCents;
  }, 0);
  const hasUnknownPrice = rows.some(({ product }) => !product || product.priceVisibility !== "visible");

  function change(id: string, quantity: number) {
    const next = items.filter((item) => item.id !== id);
    if (Number.isInteger(quantity) && quantity > 0 && quantity <= 999) next.push({ id, quantity });
    writeCart(next);
  }

  if (items.length === 0) return <div className="rounded-xl border border-line bg-white p-6"><p>Votre panier est vide.</p><Link href="/catalogue" className="mt-4 inline-block text-honey-dark underline">Voir le catalogue</Link></div>;

  return <div className="space-y-4">
    {rows.map(({ item, product }) => <div key={item.id} className="rounded-xl border border-line bg-white p-5">
      {product ? <>
        <Link href={`/produits/${product.slug}`} className="font-semibold text-ink hover:underline">{product.name}</Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="text-sm">Quantité <input type="number" min={1} max={999} value={item.quantity} onChange={(event) => change(item.id, Number(event.target.value))} className="ml-2 w-20 rounded border border-line p-2" /></label>
          <span className="text-sm">{product.priceVisibility === "visible" ? formatEuros(calculatePricedLine(product.basePrice, product.pricingTiers, item.quantity).lineTotalCents) : "Prix sur demande"}</span>
          <button type="button" onClick={() => change(item.id, 0)} className="text-sm text-honey-dark underline">Retirer</button>
        </div>
        {product.stockStatusLabel === "sold_out" || product.displayedStockQuantity === 0 ? <p className="mt-2 text-sm text-red-700">Produit épuisé : retirez-le du panier.</p> : null}
      </> : <><p className="text-sm text-red-700">Ce produit n’est plus disponible dans le catalogue.</p><button type="button" onClick={() => change(item.id, 0)} className="mt-2 text-sm text-honey-dark underline">Retirer</button></>}
    </div>)}
    <div className="rounded-xl bg-sand p-5"><p className="font-semibold">Total estimé : {formatEuros(total)}{hasUnknownPrice ? " + prix à confirmer" : ""}</p><p className="mt-2 text-sm">La demande de commande sera disponible prochainement. Pour réserver, contactez directement l’apiculteur.</p><Link href="/contact" className="mt-3 inline-block text-honey-dark underline">Contacter l’apiculteur</Link></div>
  </div>;
}
