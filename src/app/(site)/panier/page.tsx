import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getPublicCatalog } from "@/data/catalog";

export const metadata: Metadata = { title: "Panier", robots: { index: false, follow: false } };

export default async function CartPage() {
  const catalog = await getPublicCatalog();
  return <main className="mx-auto w-full max-w-[850px] flex-1 px-6 py-12"><h1 className="mb-8 font-display text-3xl text-ink">Votre panier</h1>{catalog.kind === "ready" ? <CartView products={catalog.products} /> : <p>Le catalogue n’est pas encore configuré.</p>}</main>;
}
