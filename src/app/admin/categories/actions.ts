"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { slugify } from "@/lib/catalog/product-form";
import { createClient } from "@/lib/supabase/server";

export type CategoryFormState = { status: "idle" | "error" | "success"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/produits");
  revalidatePath("/catalogue");
}

export async function saveCategoryAction(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  const name = field(formData, "name");
  const slug = field(formData, "slug") || slugify(name);
  const description = field(formData, "description");
  const order = field(formData, "displayOrder") || "0";

  if (name.length < 2 || name.length > 60) {
    return { status: "error", message: "Le nom doit contenir entre 2 et 60 caractères." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return { status: "error", message: "Lien invalide : minuscules, chiffres et tirets uniquement." };
  }
  if (description.length > 500) {
    return { status: "error", message: "La description fait 500 caractères au maximum." };
  }
  if (!/^\d{1,4}$/.test(order)) {
    return { status: "error", message: "L’ordre doit être un nombre entier." };
  }
  if (id && !UUID.test(id)) return { status: "error", message: "Catégorie invalide." };

  const row = {
    name,
    slug,
    description: description || null,
    display_order: Number(order),
    is_active: formData.get("isActive") === "on",
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);

  if (error) {
    if (error.code === "23505") return { status: "error", message: "Ce lien est déjà utilisé par une autre catégorie." };
    console.error("Catégorie", error.code, error.message);
    return { status: "error", message: "Enregistrement impossible pour le moment." };
  }

  await recordAudit({ actorUserId: admin.userId, action: id ? "category.updated" : "category.created", entityType: "category", entityId: id || null, metadata: { name } });
  revalidateCategories();
  return { status: "success", message: id ? "Catégorie enregistrée." : "Catégorie créée." };
}

// Suppression seulement si aucun produit n'y est rattaché ; sinon la
// désactiver (elle disparaît alors du site public).
export async function deleteCategoryAction(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  if (!UUID.test(id)) return { status: "error", message: "Catégorie invalide." };

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) return { status: "error", message: "Vérification impossible pour le moment." };
  if ((count ?? 0) > 0) {
    return {
      status: "error",
      message: "Des produits utilisent encore cette catégorie : déplacez-les ou désactivez-la.",
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { status: "error", message: "Suppression impossible pour le moment." };

  await recordAudit({ actorUserId: admin.userId, action: "category.deleted", entityType: "category", entityId: id });
  revalidateCategories();
  return { status: "success", message: "Catégorie supprimée." };
}
