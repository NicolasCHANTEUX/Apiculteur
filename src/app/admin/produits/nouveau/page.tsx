import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { ImageIcon } from "@/components/icons";
import { listAdminCategories } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requireAdmin("/admin/produits/nouveau");
  const categories = await listAdminCategories();

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/produits", label: "Produits" }]}
        title="Nouveau produit"
        description="Renseignez l’essentiel : le produit est créé en brouillon, invisible sur le site, puis vous ajoutez ses photos avant de le publier."
      />
      <ProductForm
        productId={null}
        updatedAt={null}
        initialValues={null}
        initialTiers={[]}
        initialAttributes={[]}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        imageCount={0}
        coverUrl={null}
        photos={
          <Panel title="Photos">
            <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-line bg-cream/40 px-4 py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-parchment ring-1 ring-line/70">
                <ImageIcon className="size-[18px]" />
              </span>
              <p className="text-[13.5px] leading-[1.5] text-muted">
                Les photos s’ajoutent juste après la création du brouillon : enregistrez d’abord la fiche.
              </p>
            </div>
          </Panel>
        }
      />
    </main>
  );
}
