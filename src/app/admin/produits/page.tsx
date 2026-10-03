import type { Metadata } from "next";
import Link from "next/link";
import { setProductStatusAction, updateStockAction } from "@/app/admin/produits/actions";
import { AdminHeader, StatusPill, adminButton, adminInput } from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/admin/confirm-button";
import { formatPrice } from "@/components/catalog/product-display";
import { listAdminCategories, listAdminProducts } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";
import { productStatusLabels } from "@/lib/catalog/labels";

export const metadata: Metadata = { title: "Produits" };

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export default async function AdminProductsPage(props: PageProps<"/admin/produits">) {
  await requireAdmin("/admin/produits");
  const params = await props.searchParams;
  const filters = { q: param(params.q), categorie: param(params.categorie), statut: param(params.statut) };
  const [products, categories] = await Promise.all([
    listAdminProducts(filters),
    listAdminCategories(),
  ]);
  const filtered = Boolean(filters.q || filters.categorie || filters.statut);

  return (
    <main className="space-y-6">
      <AdminHeader
        title="Produits"
        description={`${products.length} produit${products.length > 1 ? "s" : ""}${filtered ? " correspondant aux filtres" : ""}. Les produits archivés sont masqués par défaut.`}
        actions={
          <>
            <Link href="/admin/categories" className={adminButton.secondary}>
              Catégories
            </Link>
            <Link href="/admin/produits/nouveau" className={adminButton.primary}>
              Nouveau produit
            </Link>
          </>
        }
      />

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-line/70 bg-white p-4" role="search">
        <label className="min-w-[220px] flex-1 text-[13px] text-ink">
          Recherche
          <input name="q" defaultValue={filters.q} placeholder="Nom ou référence" className={`${adminInput} mt-1.5 h-10`} />
        </label>
        <label className="text-[13px] text-ink">
          Catégorie
          <select name="categorie" defaultValue={filters.categorie} className={`${adminInput} mt-1.5 h-10 w-auto`}>
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-ink">
          Statut
          <select name="statut" defaultValue={filters.statut} className={`${adminInput} mt-1.5 h-10 w-auto`}>
            <option value="">Tous (hors archivés)</option>
            {Object.entries(productStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={adminButton.secondary}>
          Filtrer
        </button>
        {filtered ? (
          <Link href="/admin/produits" className="min-h-10 content-center text-[13px] text-honey">
            Réinitialiser
          </Link>
        ) : null}
      </form>

      {products.length === 0 ? (
        <p className="rounded-xl border border-line/70 bg-white p-6 text-[14px] text-muted">
          Aucun produit{filtered ? " ne correspond à ces filtres" : " pour le moment"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => {
            const low =
              product.lowStockThreshold !== null && product.stockQuantity <= product.lowStockThreshold;
            return (
              <li
                key={product.id}
                className="grid gap-4 rounded-xl border border-line/70 bg-white p-4 md:grid-cols-[64px_1fr_auto_auto] md:items-center"
              >
                <div className="hidden size-16 overflow-hidden rounded-lg bg-sand md:block">
                  {product.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.coverUrl} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <Link href={`/admin/produits/${product.id}`} className="font-medium text-ink hover:text-honey">
                    {product.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
                    <StatusPill status={product.status} label={productStatusLabels[product.status]} />
                    {product.categoryName ? <span>{product.categoryName}</span> : null}
                    {product.sku ? <span>Réf. {product.sku}</span> : null}
                    <span className="font-medium text-ink">{formatPrice(product.basePrice)}</span>
                  </p>
                </div>
                <form action={updateStockAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={product.id} />
                  <label htmlFor={`stock-${product.id}`} className={`text-[12.5px] ${low ? "text-orange-700" : "text-muted"}`}>
                    Stock{low ? " faible" : ""}
                  </label>
                  <input
                    id={`stock-${product.id}`}
                    name="stockQuantity"
                    defaultValue={product.stockQuantity}
                    inputMode="numeric"
                    className={`${adminInput} h-9 w-20! text-center`}
                  />
                  <SubmitButton className={adminButton.small} title="Enregistrer le stock">
                    OK
                  </SubmitButton>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/admin/produits/${product.id}`} className={adminButton.small}>
                    Modifier
                  </Link>
                  {product.status !== "published" ? (
                    <form action={setProductStatusAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="status" value="published" />
                      <SubmitButton className={adminButton.small}>Publier</SubmitButton>
                    </form>
                  ) : (
                    <form action={setProductStatusAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="status" value="hidden" />
                      <SubmitButton className={adminButton.small}>Masquer</SubmitButton>
                    </form>
                  )}
                  {product.status !== "archived" ? (
                    <form action={setProductStatusAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="status" value="archived" />
                      <SubmitButton
                        className={adminButton.small}
                        confirm={`Archiver « ${product.name} » ? Il disparaîtra du site ; ses commandes restent consultables.`}
                      >
                        Archiver
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
