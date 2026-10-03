import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeading, buttonStyles, container } from "@/components/ui";
import type { PublicProduct } from "@/data/catalog";

export function CatalogPreview({ products }: { products: PublicProduct[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-sand py-20 sm:py-24">
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Disponibilités" title="Les essaims disponibles" />
          <Link href="/catalogue" className={`${buttonStyles.link} mb-2`}>
            Tout le catalogue
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
