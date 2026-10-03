import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Notice, StatusPill, adminButton } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImagesManager } from "@/components/admin/product-images";
import { getAdminProduct, listAdminCategories } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";
import { productStatusLabels } from "@/lib/catalog/labels";

export const metadata: Metadata = { title: "Modifier un produit" };

export default async function EditProductPage(props: PageProps<"/admin/produits/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/produits/${id}`);
  const [product, categories, query] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
    props.searchParams,
  ]);
  if (!product) notFound();

  const status = String(product.values.status) as keyof typeof productStatusLabels;
  const slug = String(product.values.slug);

  return (
    <main className="space-y-6">
      <AdminHeader
        title={String(product.values.name)}
        description={<StatusPill status={status} label={productStatusLabels[status]} />}
        actions={
          <>
            <Link href="/admin/produits" className={adminButton.secondary}>
              Tous les produits
            </Link>
            {status === "published" ? (
              <Link href={`/produits/${slug}`} target="_blank" className={adminButton.secondary}>
                Voir la fiche ↗
              </Link>
            ) : null}
          </>
        }
      />
      {query.enregistre ? <Notice tone="success">Produit enregistré.</Notice> : null}

      <ProductImagesManager productId={product.id} images={product.images} />
      <ProductForm
        // Recrée le formulaire après chaque enregistrement (nouvelle version).
        key={product.updatedAt}
        productId={product.id}
        updatedAt={product.updatedAt}
        initialValues={product.values}
        initialTiers={product.tiers}
        initialAttributes={product.attributes}
        categories={categories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))}
      />
    </main>
  );
}
