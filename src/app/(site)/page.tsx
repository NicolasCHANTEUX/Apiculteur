import { connection } from "next/server";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { AboutSection } from "@/components/home/about-section";
import { CatalogPreview } from "@/components/home/catalog-preview";
import { ContactCta } from "@/components/home/contact-cta";
import { Hero } from "@/components/home/hero";
import { ProcessSteps } from "@/components/home/process-steps";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { container } from "@/components/ui";
import { getPublicCatalog } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";

export default async function Home() {
  // La configuration Supabase peut etre fournie au demarrage du serveur et
  // ne doit pas etre figee au moment du build (meme raison que la page
  // catalogue).
  await connection();
  const [catalogResult, reviewsResult] = await Promise.allSettled([
    getPublicCatalog(),
    getPublicReviews(),
  ]);

  if (catalogResult.status === "rejected") console.error("Accueil : catalogue indisponible", catalogResult.reason);
  if (reviewsResult.status === "rejected") console.error("Accueil : avis indisponibles", reviewsResult.reason);
  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : null;
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : null;

  const products = catalog?.kind === "ready" ? catalog.products : [];
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );

  return (
    <main className="flex-1">
      <Hero />
      <AboutSection />

      {catalog === null ? (
        <div className="bg-sand py-16">
          <div className={container}>
            <section className="rounded-xl border border-line bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Catalogue momentanément indisponible</h2>
              <p className="mt-2 text-sm text-body">Les produits ne peuvent pas être affichés pour le moment. Réessayez dans quelques instants.</p>
            </section>
          </div>
        </div>
      ) : catalog.kind === "unconfigured" ? (
        <div className="bg-sand py-16">
          <div className={container}>
            <CatalogUnconfigured />
          </div>
        </div>
      ) : (
        <CatalogPreview products={products} />
      )}

      <ProcessSteps />

      {reviews?.kind === "ready" ? (
        <TestimonialsSection
          reviews={reviews.reviews}
          productNames={productNames}
        />
      ) : null}

      <ContactCta />
    </main>
  );
}
