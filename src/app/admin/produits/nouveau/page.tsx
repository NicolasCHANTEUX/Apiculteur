import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { listAdminCategories } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requireAdmin("/admin/produits/nouveau");
  const categories = await listAdminCategories();

  return (
    <main className="space-y-6">
      <AdminHeader
        title="Nouveau produit"
        description="Étape 1 : renseignez le produit. Il sera enregistré en brouillon. Étape 2 : ajoutez ses photos, puis publiez-le quand il est prêt."
      />
      <ProductForm
        productId={null}
        updatedAt={null}
        initialValues={null}
        initialTiers={[]}
        initialAttributes={[]}
        categories={categories.map(({ id, name }) => ({ id, name }))}
      />
    </main>
  );
}
