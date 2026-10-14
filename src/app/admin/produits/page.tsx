import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  EmptyState,
  Notice,
  PageHeader,
  StatusPill,
  adminButton,
  panelClass,
} from "@/components/admin/admin-ui";
import { ProductActions } from "@/components/admin/product-actions";
import { ProductFilters } from "@/components/admin/product-filters";
import { StockStepper } from "@/components/admin/stock-stepper";
import { formatPrice } from "@/components/catalog/product-display";
import { ImageIcon, PackageIcon, PencilIcon, PlusIcon, StarFilledIcon, TagIcon } from "@/components/icons";
import { listAdminCategories, listAdminProducts, type AdminProductRow } from "@/data/admin/products";
import { LinkPending } from "@/components/admin/link-pending";
import { requireAdmin } from "@/data/auth";
import { isStockFilter } from "@/lib/admin/product-health";
import { productStatusLabels } from "@/lib/catalog/labels";
import { productStatuses } from "@/lib/catalog/product-form";

export const metadata: Metadata = { title: "Produits" };

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

const tabs = [
  { value: "", label: "Tous", count: "all" },
  { value: "published", label: "En ligne", count: "published" },
  { value: "draft", label: "Brouillons", count: "draft" },
  { value: "hidden", label: "Masqués", count: "hidden" },
  { value: "sold_out", label: "Épuisés", count: "sold_out" },
  { value: "archived", label: "Archivés", count: "archived" },
] as const;

function priceLabel(product: AdminProductRow) {
  if (product.priceVisibility === "on_request") return { main: "Sur demande", unit: null };
  if (product.priceVisibility === "hidden") return { main: "Prix masqué", unit: null };
  return { main: formatPrice(product.basePrice), unit: product.saleUnit };
}

function Thumbnail({ product }: { product: AdminProductRow }) {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-sand ring-1 ring-line/60 ring-inset">
      {product.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.coverUrl} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-parchment">
          <ImageIcon className="size-5" />
        </span>
      )}
    </div>
  );
}

export default async function AdminProductsPage(props: PageProps<"/admin/produits">) {
  await requireAdmin("/admin/produits");
  const params = await props.searchParams;
  const statut = param(params.statut);
  const stock = param(params.stock);
  const filters = {
    q: param(params.q),
    categorie: param(params.categorie),
    statut: (productStatuses as readonly string[]).includes(statut) ? statut : "",
    stock: isStockFilter(stock) ? stock : "",
  };
  const [{ products, statusCounts }, categories] = await Promise.all([
    listAdminProducts(filters),
    listAdminCategories(),
  ]);
  const filtered = Boolean(filters.q || filters.categorie || filters.stock);
  const tabHref = (value: string) => {
    const query = new URLSearchParams();
    for (const [name, current] of Object.entries({ ...filters, statut: value })) {
      if (current) query.set(name, current);
    }
    const search = query.toString();
    return search ? `/admin/produits?${search}` : "/admin/produits";
  };

  return (
    <main className="space-y-6">
      <PageHeader
        title="Produits"
        description="Publiez vos fiches, ajustez le stock et organisez le catalogue."
        actions={
          <>
            <Link href="/admin/categories" className={adminButton.secondary}>
              <TagIcon className="size-4" />
              Catégories
            </Link>
            <Link href="/admin/produits/nouveau" className={adminButton.primary}>
              <PlusIcon className="size-4" />
              Nouveau produit
            </Link>
          </>
        }
      />

      {params.supprime ? <Notice tone="success">Le produit a été supprimé définitivement.</Notice> : null}

      <section className={panelClass} aria-label="Liste des produits">
        <nav aria-label="Filtrer par statut" className="overflow-x-auto border-b border-line/60">
          <ul className="flex min-w-max gap-1 px-3 pt-2 sm:px-4">
            {tabs.map((tab) => {
              const current = filters.statut === tab.value;
              return (
                <li key={tab.value}>
                  <Link
                    href={tabHref(tab.value)}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-2 px-3 text-[13.5px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                      current
                        ? "text-ink after:bg-honey"
                        : "text-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-px text-[11.5px] tabular-nums ${
                        current ? "bg-honey/15 text-honey-dark" : "bg-sand text-muted"
                      }`}
                    >
                      {statusCounts[tab.count]}
                    </span>
                    <LinkPending className="-ml-1 text-honey" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ProductFilters
          key={`${filters.q}|${filters.categorie}|${filters.stock}`}
          filters={filters}
          categories={categories.map(({ id, name }) => ({ id, name }))}
        />

        {products.length === 0 ? (
          <div className="border-t border-line/60">
            {filtered || filters.statut ? (
              <EmptyState icon={<PackageIcon className="size-5" />} title="Aucun produit ne correspond">
                Modifiez la recherche ou les filtres pour élargir la liste.
              </EmptyState>
            ) : (
              <EmptyState
                icon={<PackageIcon className="size-5" />}
                title="Votre catalogue est vide"
                action={
                  <Link href="/admin/produits/nouveau" className={adminButton.primary}>
                    <PlusIcon className="size-4" />
                    Créer un premier produit
                  </Link>
                }
              >
                Créez une fiche, ajoutez ses photos puis publiez-la : elle apparaîtra dans « Nos essaims ».
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            <div
              aria-hidden
              className="hidden border-y border-line/60 bg-cream/60 px-5 py-2 text-[11.5px] font-medium tracking-[0.06em] text-muted uppercase md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_9.5rem_7.5rem_5.5rem] md:gap-4"
            >
              <span>Produit</span>
              <span>Prix</span>
              <span>Stock</span>
              <span>Statut</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-line/60 border-t border-line/60 md:border-t-0">
              {products.map((product) => {
                const price = priceLabel(product);
                return (
                  <li
                    key={product.id}
                    className="px-4 py-3.5 transition has-data-pending:opacity-50 sm:px-5 md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_9.5rem_7.5rem_5.5rem] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <Thumbnail product={product} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produits/${product.id}`}
                          className="line-clamp-2 font-medium text-ink hover:text-honey-dark"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
                          <span className="md:hidden">
                            <StatusPill status={product.status} label={productStatusLabels[product.status]} />
                          </span>
                          <span className="font-medium text-ink md:hidden">{price.main}</span>
                          {product.categoryName ? <span>{product.categoryName}</span> : null}
                          {product.sku ? <span>Réf. {product.sku}</span> : null}
                          {product.imageCount === 0 ? (
                            <Badge tone="warning">
                              <ImageIcon className="size-3" />
                              Sans photo
                            </Badge>
                          ) : null}
                          {product.featured ? (
                            <Badge tone="honey">
                              <StarFilledIcon className="size-3" />
                              En avant
                            </Badge>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <p className="hidden text-[14px] md:block">
                      <span className="font-medium text-ink">{price.main}</span>
                      {price.unit ? <span className="block text-[12px] text-muted">/ {price.unit}</span> : null}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 md:contents">
                      <StockStepper
                        id={product.id}
                        name={product.name}
                        stock={product.stockQuantity}
                        threshold={product.lowStockThreshold}
                        purchaseMode={product.purchaseMode}
                      />
                      <div className="hidden md:block">
                        <StatusPill status={product.status} label={productStatusLabels[product.status]} />
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/produits/${product.id}`}
                          className={adminButton.icon}
                          aria-label={`Modifier ${product.name}`}
                          title="Modifier"
                        >
                          <PencilIcon className="size-4" />
                        </Link>
                        <ProductActions
                          product={{ id: product.id, name: product.name, slug: product.slug, status: product.status }}
                          context="list"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line/60 px-5 py-3 text-[12.5px] text-muted">
              {products.length} produit{products.length > 1 ? "s" : ""} affiché{products.length > 1 ? "s" : ""}
              {filters.statut === "" ? " · les produits archivés sont dans leur onglet" : ""}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
