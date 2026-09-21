import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import {
  getAvailabilityLabel,
  getPriceLabel,
} from "@/components/catalog/product-card";
import { getPublicProductBySlug } from "@/data/catalog";
import { eurosToCents, formatEuros } from "@/lib/domain/pricing";

export async function generateMetadata(
  props: PageProps<"/produits/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getPublicProductBySlug(slug);

  if (result.kind !== "ready" || !result.product) {
    return { title: "Produit" };
  }

  return {
    title: result.product.seoTitle ?? result.product.name,
    description:
      result.product.seoDescription ?? result.product.shortDescription,
  };
}

export default async function ProductPage(
  props: PageProps<"/produits/[slug]">,
) {
  const { slug } = await props.params;
  const result = await getPublicProductBySlug(slug);

  if (result.kind === "unconfigured") {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <CatalogUnconfigured />
      </main>
    );
  }

  if (!result.product) {
    notFound();
  }

  const product = result.product;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/catalogue"
        className="text-sm font-medium text-stone-600 hover:text-stone-950"
      >
        ← Retour au catalogue
      </Link>

      <article className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        {product.category ? (
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
            {product.category.name}
          </p>
        ) : null}
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          {product.name}
        </h1>
        {product.shortDescription ? (
          <p className="mt-5 text-xl leading-8 text-stone-600">
            {product.shortDescription}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-4 rounded-2xl bg-stone-50 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-stone-500">Prix</dt>
            <dd className="mt-1 font-semibold text-stone-950">
              {getPriceLabel(product)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Disponibilité</dt>
            <dd className="mt-1 font-semibold text-stone-950">
              {getAvailabilityLabel(product)}
            </dd>
          </div>
        </dl>

        {product.longDescription ? (
          <div className="mt-8 whitespace-pre-line leading-8 text-stone-700">
            {product.longDescription}
          </div>
        ) : null}

        {product.pricingTiers.length > 0 &&
        product.priceVisibility === "visible" ? (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-stone-950">
              Tarifs par quantité
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-sm text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quantité</th>
                    <th className="px-4 py-3 font-medium">Prix unitaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {product.pricingTiers.map((tier) => (
                    <tr key={`${tier.minQuantity}-${tier.maxQuantity ?? "plus"}`}>
                      <td className="px-4 py-3 text-stone-700">
                        {tier.maxQuantity === null
                          ? `À partir de ${tier.minQuantity}`
                          : `De ${tier.minQuantity} à ${tier.maxQuantity}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-950">
                        {formatEuros(eurosToCents(tier.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-stone-950">Commande bientôt disponible</h2>
          <p className="mt-2 leading-7 text-stone-700">
            Le catalogue est maintenant relié au modèle métier. Le panier et la
            demande de commande constituent le prochain lot.
          </p>
        </section>
      </article>
    </main>
  );
}
