import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, adminButton } from "@/components/admin/admin-ui";
import { CategoryForm } from "@/components/admin/category-forms";
import { listAdminCategories } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";

export const metadata: Metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const categories = await listAdminCategories();

  return (
    <main className="space-y-6">
      <AdminHeader
        title="Catégories"
        description="Elles servent de filtre dans le catalogue. Une catégorie qui contient des produits ne peut pas être supprimée : désactivez-la."
        actions={
          <Link href="/admin/produits" className={adminButton.secondary}>
            Produits
          </Link>
        }
      />
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-semibold text-ink">Nouvelle catégorie</h2>
        <CategoryForm />
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-semibold text-ink">
          Catégories existantes ({categories.length})
        </h2>
        {categories.map((category) => (
          <CategoryForm key={`${category.id}-${category.name}-${category.displayOrder}-${category.isActive}`} category={category} />
        ))}
      </section>
    </main>
  );
}
