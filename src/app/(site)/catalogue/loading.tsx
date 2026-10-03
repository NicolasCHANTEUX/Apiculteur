import { CatalogHeader } from "@/components/catalog/catalog-header";
import { container } from "@/components/ui";

export default function CatalogLoading() {
  return (
    <main className="flex-1">
      <CatalogHeader />
      <div className={`${container} pt-10 pb-24`} aria-busy>
        <div className="h-[72px] animate-pulse rounded-xl border border-line bg-white" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[340px] animate-pulse rounded-xl border border-line/50 bg-white"
            />
          ))}
        </div>
        <p className="sr-only">Chargement du catalogue…</p>
      </div>
    </main>
  );
}
