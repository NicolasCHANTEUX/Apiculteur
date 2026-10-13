import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PageHeader, StatusPill, adminButton } from "@/components/admin/admin-ui";
import { ProductActions } from "@/components/admin/product-actions";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImagesManager } from "@/components/admin/product-images";
import { ExternalLinkIcon } from "@/components/icons";
import { getAdminProduct, listAdminCategories, type ProductStatus } from "@/data/admin/products";
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

  const status = String(product.values.status) as ProductStatus;
  const slug = String(product.values.slug);
  const name = String(product.values.name);
  const sku = String(product.values.sku);

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/produits", label: "Produits" }]}
        title={name}
        meta={
          <>
            <StatusPill status={status} label={productStatusLabels[status]} />
            {sku ? <span className="text-[13px] text-muted">Réf. {sku}</span> : null}
          </>
        }
        actions={
          <>
            {status === "published" ? (
              <Link href={`/produits/${slug}`} target="_blank" rel="noopener" className={adminButton.secondary}>
                <ExternalLinkIcon className="size-4" />
                Voir sur le site
              </Link>
            ) : null}
            <ProductActions product={{ id: product.id, name, slug, status }} context="edit" />
          </>
        }
      />

      {query.enregistre ? <Notice tone="success">Modifications enregistrées.</Notice> : null}
      {query.cree ? (
        <Notice tone="success">
          Brouillon créé. Ajoutez maintenant ses photos, puis passez-le en « Publié » quand la fiche est prête.
        </Notice>
      ) : null}
      {query.copie ? (
        <Notice tone="info">
          Copie créée en brouillon. Vérifiez son nom, ses photos et son stock avant de la publier.
        </Notice>
      ) : null}

      <ProductForm
        // Recrée le formulaire après chaque enregistrement (nouvelle version).
        key={product.updatedAt}
        productId={product.id}
        updatedAt={product.updatedAt}
        initialValues={product.values}
        initialTiers={product.tiers}
        initialAttributes={product.attributes}
        categories={categories.map(({ id: categoryId, name: categoryName }) => ({ id: categoryId, name: categoryName }))}
        photos={<ProductImagesManager productId={product.id} images={product.images} />}
        imageCount={product.images.length}
        coverUrl={product.images[0]?.url ?? null}
      />
    </main>
  );
}
