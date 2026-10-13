"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { slugify } from "@/lib/catalog/product-form";
import { createClient } from "@/lib/supabase/server";

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
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  const name = field(formData, "name");
  const slug = field(formData, "slug") || slugify(name);
  const description = field(formData, "description");

  if (name.length < 2 || name.length > 60) {
    return failure("Le nom doit contenir entre 2 et 60 caractères.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return failure("Lien invalide : minuscules, chiffres et tirets uniquement.");
  }
  if (description.length > 500) {
    return failure("La description fait 500 caractères au maximum.");
  }
  if (id && !UUID.test(id)) return failure("Catégorie invalide.");

  const supabase = await createClient();
  const row = {
    name,
    slug,
    description: description || null,
    is_active: formData.get("isActive") === "on",
  };

  let savedId = id;
  let error;
  if (id) {
    ({ error } = await supabase.from("categories").update(row).eq("id", id));
  } else {
    // Une nouvelle catégorie se place en dernier.
    const { data: last } = await supabase
      .from("categories")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const inserted = await supabase
      .from("categories")
      .insert({ ...row, display_order: (last?.display_order ?? -1) + 1 })
      .select("id")
      .single();
    error = inserted.error;
    savedId = inserted.data?.id ?? "";
  }

  if (error) {
    if (error.code === "23505") return failure("Ce lien est déjà utilisé par une autre catégorie.");
    console.error("Catégorie", error.code, error.message);
    return failure("Enregistrement impossible pour le moment.");
  }

  await recordAudit({ actorUserId: admin.userId, action: id ? "category.updated" : "category.created", entityType: "category", entityId: savedId || null, metadata: { name } });
  revalidateCategories();
  return success(id ? `« ${name} » est enregistrée.` : `Catégorie « ${name} » créée.`);
}

export async function setCategoryActiveAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Catégorie invalide.");
  const isActive = formData.get("isActive") === "true";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) return failure("Modification impossible pour le moment.");
  if (!data) return failure("Cette catégorie n’existe plus.");

  await recordAudit({ actorUserId: admin.userId, action: "category.updated", entityType: "category", entityId: id, metadata: { name: data.name, is_active: isActive } });
  revalidateCategories();
  return success(isActive ? `« ${data.name} » est visible sur le site.` : `« ${data.name} » est masquée du site.`);
}

// Échange avec la voisine puis renumérote 0..n, pour un ordre toujours net.
export async function moveCategoryAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  const direction = field(formData, "direction");
  if (!UUID.test(id) || (direction !== "up" && direction !== "down")) return failure("Déplacement invalide.");

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("categories")
    .select("id, name, display_order")
    .order("display_order")
    .order("name");
  if (error || !rows) return failure("Lecture des catégories impossible.");

  const ids = rows.map((row) => row.id as string);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return failure("Déplacement impossible.");
  [ids[index], ids[target]] = [ids[target], ids[index]];

  for (const [position, categoryId] of ids.entries()) {
    if (rows.find((row) => row.id === categoryId)?.display_order === position) continue;
    const { error: updateError } = await supabase
      .from("categories")
      .update({ display_order: position })
      .eq("id", categoryId);
    if (updateError) return failure("Le nouvel ordre n’a pas pu être enregistré. Rechargez la page.");
  }

  await recordAudit({ actorUserId: admin.userId, action: "category.reordered", entityType: "category", entityId: id, metadata: { name: rows[index]?.name, direction } });
  revalidateCategories();
  return success("Ordre des catégories mis à jour.");
}

// Suppression seulement si aucun produit n'y est rattaché ; sinon la
// désactiver (elle disparaît alors du site public).
export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/categories");
  const id = field(formData, "id");
  if (!UUID.test(id)) return failure("Catégorie invalide.");

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) return failure("Vérification impossible pour le moment.");
  if ((count ?? 0) > 0) {
    return failure("Des produits utilisent encore cette catégorie : déplacez-les ou masquez-la.");
  }

  const { data, error } = await supabase.from("categories").delete().eq("id", id).select("name").maybeSingle();
  if (error) return failure("Suppression impossible pour le moment.");

  await recordAudit({ actorUserId: admin.userId, action: "category.deleted", entityType: "category", entityId: id, metadata: { name: data?.name } });
  revalidateCategories();
  return success(data?.name ? `Catégorie « ${data.name} » supprimée.` : "Catégorie supprimée.");
}
