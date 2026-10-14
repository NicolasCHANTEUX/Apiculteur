import type { Metadata } from "next";
import { connection } from "next/server";
import { CartView } from "@/components/cart/cart-view";
import { Eyebrow, container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getOrderSettings } from "@/data/settings";

export const metadata: Metadata = { title: "Panier", robots: { index: false, follow: false } };

export default async function CartPage() {
  // Prix et disponibilités lus à chaque visite, jamais figés au moment du build.
  await connection();
  const [catalog, settings] = await Promise.all([getPublicCatalog(), getOrderSettings()]);
  return (
    <main className={`${container} flex-1 pt-12 pb-24`}>
      <Eyebrow>Votre sélection</Eyebrow>
      <h1 className="mt-3 mb-8 font-display text-[34px] leading-tight font-medium text-ink">Votre panier</h1>
      {catalog.kind === "ready" ? (
        <CartView products={catalog.products} ordersOpen={settings.ordersOpen} />
      ) : (
        <p className="rounded-xl border border-line bg-white p-6 text-[14px] text-body">Le catalogue n’est pas encore configuré.</p>
      )}
    </main>
  );
}
