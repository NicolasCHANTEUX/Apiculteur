import type { Metadata } from "next";
import { connection } from "next/server";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { ProductCard } from "@/components/catalog/product-card";
import { getPublicCatalog } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Découvrez les produits et disponibilités de l'apiculteur.",
};

export default async function CatalogPage() {
  // La configuration Supabase peut etre fournie au demarrage du serveur et
  // ne doit pas etre figee au moment du build.
  await connection();
  const result = await getPublicCatalog();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-800">
          Catalogue
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Produits disponibles
        </h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">
          Les disponibilités et les tarifs présentés ici proviennent directement
          du catalogue géré par l&apos;apiculteur.
        </p>
      </header>

      {result.kind === "unconfigured" ? <CatalogUnconfigured /> : null}

      {result.kind === "ready" && result.products.length === 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-8">
          <h2 className="text-xl font-semibold text-stone-950">
            Aucun produit publié pour le moment
          </h2>
          <p className="mt-2 text-stone-600">
            Revenez prochainement pour découvrir les nouvelles disponibilités.
          </p>
        </section>
      ) : null}

      {result.kind === "ready" && result.products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
