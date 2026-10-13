"use client";

import { useRef, useState } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { PublicProduct } from "@/data/catalog";

// Carrousel des produits de l'accueil au-delà de quatre : défilement
// horizontal natif (glisser, molette, clavier) et boutons précédent/suivant.
// Pas de défilement automatique.
export function ProductCarousel({ products }: { products: PublicProduct[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setEdges({
            start: track.scrollLeft < 8,
            end: track.scrollLeft + track.clientWidth > track.scrollWidth - 8,
          });
        }}
        className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Produits disponibles"
      >
        {products.map((product) => (
          <li key={product.id} className="w-[82%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        {([-1, 1] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            onClick={() => scroll(direction)}
            disabled={direction < 0 ? edges.start : edges.end}
            aria-label={direction < 0 ? "Produits précédents" : "Produits suivants"}
            className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-honey/50 hover:text-honey-dark disabled:opacity-35"
          >
            {direction < 0 ? <ChevronLeftIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
