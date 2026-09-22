import { connection } from "next/server";
import { CatalogUnconfigured } from "@/components/catalog/catalog-unconfigured";
import { AboutSection } from "@/components/home/about-section";
import { CatalogPreview } from "@/components/home/catalog-preview";
import { ContactCta } from "@/components/home/contact-cta";
import { Hero } from "@/components/home/hero";
import { ProcessSteps } from "@/components/home/process-steps";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { getPublicCatalog } from "@/data/catalog";
import { getPublicReviews } from "@/data/reviews";

export default async function Home() {
  // La configuration Supabase peut etre fournie au demarrage du serveur et
  // ne doit pas etre figee au moment du build (meme raison que la page
  // catalogue).
  await connection();
  const [catalog, reviews] = await Promise.all([
    getPublicCatalog(),
    getPublicReviews(),
  ]);

  return (
    <main className="flex-1">
      <Hero />
      <AboutSection />

      {catalog.kind === "unconfigured" ? (
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          <CatalogUnconfigured />
        </div>
      ) : (
        <CatalogPreview products={catalog.products} />
      )}

      <ProcessSteps />

      {reviews.kind === "ready" ? (
        <TestimonialsSection reviews={reviews.reviews} />
      ) : null}

      <ContactCta />
    </main>
  );
}
