import type { Metadata } from "next";
import { CategoryRow, NewCategoryForm } from "@/components/admin/category-forms";
import { EmptyState, PageHeader, Panel } from "@/components/admin/admin-ui";
import { TagIcon } from "@/components/icons";
import { listAdminCategories } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";

export const metadata: Metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const categories = await listAdminCategories();

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/produits", label: "Produits" }]}
        title="Catégories"
        description="Elles servent de filtre dans le catalogue, dans l’ordre choisi ici. Une catégorie qui contient des produits ne peut pas être supprimée : masquez-la."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Panel
          title="Catégories du catalogue"
          description={`${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}
          flush
        >
          {categories.length === 0 ? (
            <EmptyState icon={<TagIcon className="size-5" />} title="Aucune catégorie">
              Créez par exemple « Essaims », « Reines » et « Ruches » pour classer vos produits.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line/60">
              {categories.map((category, index) => (
                <CategoryRow
                  key={`${category.id}-${category.name}-${category.description}-${category.isActive}-${category.slug}`}
                  category={category}
                  first={index === 0}
                  last={index === categories.length - 1}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Nouvelle catégorie">
          <NewCategoryForm />
        </Panel>
      </div>
    </main>
  );
}
