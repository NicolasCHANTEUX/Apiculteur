"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { copyName, copySlug } from "@/lib/admin/product-health";
import { parseProductForm } from "@/lib/catalog/product-form";
import {
  ImageRejectedError,
  MAX_IMAGES_PER_PRODUCT,
  normalizeProductImage,
} from "@/lib/images/product-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "product-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProductFormState = {
  status: "idle" | "error";
  message: string;
  errors: Record<string, string>;
};

function uuidFrom(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function revalidateCatalog(slug?: string, productId?: string) {
  revalidatePath("/admin/produits");
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  revalidatePath("/");
  if (slug) revalidatePath(`/produits/${slug}`);
  if (productId) revalidatePath(`/admin/produits/${productId}`);
}

// Produit -------------------------------------------------------------------

export async function saveProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Certains champs sont à corriger.",
      errors: parsed.errors,
    };
  }

  const expected = formData.get("expectedUpdatedAt");
  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("admin_save_product", {
    p_id: id,
    p_expected_updated_at: typeof expected === "string" && expected ? expected : null,
    p_product: parsed.product,
    p_tiers: parsed.tiers,
    p_attributes: parsed.attributes,
  });

  if (error) {
    const constraint = `${error.message} ${error.details ?? ""}`;
    if (error.code === "23505" && constraint.includes("slug")) {
      return { status: "error", message: "Certains champs sont à corriger.", errors: { slug: "Ce lien est déjà utilisé par un autre produit." } };
    }
    if (error.code === "23505" && constraint.includes("sku")) {
      return { status: "error", message: "Certains champs sont à corriger.", errors: { sku: "Cette référence est déjà utilisée." } };
    }
    if (error.code === "23P01") {
      return { status: "error", message: "Certains champs sont à corriger.", errors: { tiers: "Les paliers se chevauchent." } };
    }
    if (error.code === "40001") {
      return {
        status: "error",
        message: "Ce produit a été modifié entre-temps (autre onglet ?). Rechargez la page pour repartir de la dernière version.",
        errors: {},
      };
    }
    console.error("Enregistrement produit", error.code, error.message);
    return { status: "error", message: "Enregistrement impossible pour le moment.", errors: {} };
  }

  await recordAudit({
    actorUserId: admin.userId,
    action: id ? "product.updated" : "product.created",
    entityType: "product",
    entityId: savedId as string,
    metadata: { name: parsed.product.name, status: parsed.product.status },
  });
  revalidateCatalog(parsed.product.slug, savedId as string);
  // Un nouveau brouillon s'ouvre sur ses photos, étape suivante logique.
  redirect(id ? `/admin/produits/${savedId}?enregistre=1` : `/admin/produits/${savedId}?cree=1#photos`);
}

const quickStatuses = ["published", "hidden", "archived", "draft"] as const;

const statusMessages: Record<(typeof quickStatuses)[number], (name: string) => string> = {
  published: (name) => `« ${name} » est en ligne.`,
  hidden: (name) => `« ${name} » est masqué du site.`,
  archived: (name) => `« ${name} » est archivé.`,
  draft: (name) => `« ${name} » est repassé en brouillon.`,
};

export async function setProductStatusAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  const status = formData.get("status") as (typeof quickStatuses)[number];
  if (!id || !quickStatuses.includes(status)) return failure("Action invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", id)
    .select("slug, name")
    .maybeSingle();
  if (error) {
    console.error("Statut produit", error.code, error.message);
    return failure("Le statut n’a pas pu être modifié. Réessayez.");
  }
  if (!data) return failure("Ce produit n’existe plus.");

  await recordAudit({ actorUserId: admin.userId, action: "product.status_changed", entityType: "product", entityId: id, metadata: { status } });
  revalidateCatalog(data.slug, id);
  return success(statusMessages[status](data.name));
}

export async function updateStockAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  const raw = formData.get("stockQuantity");
  const quantity = typeof raw === "string" && /^\d{1,6}$/.test(raw.trim()) ? Number(raw) : null;
  if (!id) return failure("Produit invalide.");
  if (quantity === null || quantity > 100_000) return failure("Le stock doit être un nombre entier positif.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ stock_quantity: quantity })
    .eq("id", id)
    .select("slug, name")
    .maybeSingle();
  if (error) {
    console.error("Stock produit", error.code, error.message);
    return failure("Le stock n’a pas pu être enregistré. Réessayez.");
  }
  if (!data) return failure("Ce produit n’existe plus.");

  await recordAudit({ actorUserId: admin.userId, action: "product.stock_updated", entityType: "product", entityId: id, metadata: { stock_quantity: quantity } });
  revalidateCatalog(data.slug, id);
  return success(`Stock de « ${data.name} » : ${quantity}.`);
}

type DuplicateSource = {
  [column: string]: unknown;
  slug: string;
  name: string;
  pricing_tiers: { min_quantity: number; max_quantity: number | null; unit_price: number | string }[] | null;
  product_attributes: { label: string; value: string; unit: string | null; position: number }[] | null;
  product_images: { url: string; alt_text: string | null; display_order: number; storage_path: string | null; width: number | null; height: number | null }[] | null;
};

function columnText(row: DuplicateSource, column: string) {
  const value = row[column];
  return value === null || value === undefined ? "" : String(value);
}

// Copie en brouillon : fiche, paliers, caractéristiques et photos. La
// référence n'est pas reprise (elle est unique).
export async function duplicateProductAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  if (!id) return failure("Produit invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, pricing_tiers(min_quantity, max_quantity, unit_price), product_attributes(label, value, unit, position), product_images(url, alt_text, display_order, storage_path, width, height)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return failure("Produit introuvable.");
  const row = data as DuplicateSource;

  const { data: similar } = await supabase.from("products").select("slug").like("slug", `${row.slug}-copie%`);
  const product = {
    category_id: columnText(row, "category_id"),
    name: copyName(row.name),
    slug: copySlug(row.slug, new Set((similar ?? []).map((item) => item.slug as string))),
    sku: "",
    status: "draft",
    featured: false,
    ...Object.fromEntries(
      [
        "tagline", "short_description", "long_description", "base_price", "compare_at_price",
        "price_visibility", "purchase_mode", "condition", "defect_description", "sale_unit",
        "delivery_mode", "season_label", "stock_quantity", "low_stock_threshold",
        "stock_display_mode", "stock_status_label", "stock_custom_message", "display_order",
        "seo_title", "seo_description",
      ].map((column) => [column, columnText(row, column)]),
    ),
  };
  const tiers = [...(row.pricing_tiers ?? [])]
    .sort((a, b) => a.min_quantity - b.min_quantity)
    .map((tier) => ({ min: tier.min_quantity, max: tier.max_quantity, price: String(tier.unit_price) }));
  const attributes = [...(row.product_attributes ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(({ label, value, unit }) => ({ label, value, unit: unit ?? "" }));

  const { data: newId, error: saveError } = await supabase.rpc("admin_save_product", {
    p_id: null,
    p_expected_updated_at: null,
    p_product: product,
    p_tiers: tiers,
    p_attributes: attributes,
  });
  if (saveError || typeof newId !== "string") {
    console.error("Duplication produit", saveError?.code, saveError?.message);
    return failure("La copie n’a pas pu être créée. Réessayez.");
  }

  // Les fichiers envoyés depuis l'admin sont copiés (la copie doit pouvoir
  // supprimer ses photos sans toucher à l'original).
  const storage = createAdminClient().storage.from(BUCKET);
  const images = [...(row.product_images ?? [])].sort((a, b) => a.display_order - b.display_order);
  for (const [position, image] of images.entries()) {
    let url = image.url;
    let storagePath: string | null = null;
    if (image.storage_path) {
      storagePath = `products/${newId}/${randomUUID()}.webp`;
      const { error: copyError } = await storage.copy(image.storage_path, storagePath);
      if (copyError) {
        console.error("Copie de photo", copyError.message);
        continue;
      }
      url = storage.getPublicUrl(storagePath).data.publicUrl;
    }
    const { error: insertError } = await supabase.from("product_images").insert({
      product_id: newId,
      url,
      storage_path: storagePath,
      alt_text: image.alt_text,
      display_order: position,
      width: image.width,
      height: image.height,
    });
    if (insertError) {
      console.error("Copie de photo", insertError.message);
      if (storagePath) await storage.remove([storagePath]);
    }
  }

  await recordAudit({ actorUserId: admin.userId, action: "product.duplicated", entityType: "product", entityId: newId, metadata: { name: product.name, source: id } });
  revalidateCatalog();
  redirect(`/admin/produits/${newId}?copie=1`);
}

// Suppression définitive : brouillons et produits archivés seulement, et
// jamais un produit présent dans une commande (son historique doit rester).
export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  if (!id) return failure("Produit invalide.");

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("name, slug, status, product_images(storage_path)")
    .eq("id", id)
    .maybeSingle();
  if (error) return failure("Lecture du produit impossible pour le moment.");
  if (!product) return failure("Ce produit n’existe plus.");
  if (product.status !== "draft" && product.status !== "archived") {
    return failure("Archivez d’abord ce produit : seuls les brouillons et les produits archivés peuvent être supprimés.");
  }

  const inOrders = "Ce produit figure dans des commandes : il reste archivé pour conserver leur historique.";
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (countError) return failure("Vérification des commandes impossible pour le moment.");
  if ((count ?? 0) > 0) return failure(inOrders);

  const { error: deleteError } = await supabase.from("products").delete().eq("id", id);
  if (deleteError) {
    if (deleteError.code === "23503") return failure(inOrders);
    console.error("Suppression produit", deleteError.code, deleteError.message);
    return failure("Suppression impossible pour le moment.");
  }

  const paths = ((product.product_images ?? []) as { storage_path: string | null }[])
    .map((image) => image.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error: storageError } = await createAdminClient().storage.from(BUCKET).remove(paths);
    if (storageError) console.error("Photos du produit supprimé", storageError.message);
  }

  await recordAudit({ actorUserId: admin.userId, action: "product.deleted", entityType: "product", entityId: id, metadata: { name: product.name } });
  revalidateCatalog(product.slug);
  if (formData.get("then") === "list") redirect("/admin/produits?supprime=1");
  return success(`« ${product.name} » a été supprimé.`);
}

// Images ---------------------------------------------------------------------

async function productSlug(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("slug, name").eq("id", productId).maybeSingle();
  return data;
}

export async function uploadProductImagesAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const productId = uuidFrom(formData, "productId");
  const files = formData
    .getAll("photos")
    .filter((value): value is File => typeof value !== "string" && value.size > 0);
  if (!productId) return failure("Produit invalide.");
  if (files.length === 0) return failure("Choisissez au moins une photo.");

  const supabase = await createClient();
  const { data: existing, error: countError } = await supabase
    .from("product_images")
    .select("display_order")
    .eq("product_id", productId);
  if (countError) return failure("Lecture des photos impossible.");
  if ((existing?.length ?? 0) + files.length > MAX_IMAGES_PER_PRODUCT) {
    return failure(`${MAX_IMAGES_PER_PRODUCT} photos au maximum par produit.`);
  }

  const product = await productSlug(productId);
  if (!product) return failure("Produit introuvable.");

  // Toutes les photos sont validées et converties avant le premier envoi.
  let processed: Awaited<ReturnType<typeof normalizeProductImage>>[];
  try {
    processed = await Promise.all(
      files.map(async (file) => normalizeProductImage(Buffer.from(await file.arrayBuffer()))),
    );
  } catch (error) {
    if (error instanceof ImageRejectedError) return failure(error.message);
    console.error("Traitement d'image", error);
    return failure("Une photo n’a pas pu être traitée.");
  }

  const storage = createAdminClient().storage.from(BUCKET);
  let order = Math.max(-1, ...(existing ?? []).map((row) => row.display_order));
  const uploadedPaths: string[] = [];
  try {
    for (const image of processed) {
      const path = `products/${productId}/${randomUUID()}.webp`;
      const { error } = await storage.upload(path, image.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(path);
      order += 1;
      const { error: insertError } = await supabase.from("product_images").insert({
        product_id: productId,
        url: storage.getPublicUrl(path).data.publicUrl,
        storage_path: path,
        alt_text: product.name,
        display_order: order,
        width: image.width,
        height: image.height,
      });
      if (insertError) throw insertError;
    }
  } catch (error) {
    // Rien ne doit rester à moitié enregistré : on retire les fichiers et
    // les lignes de cet envoi.
    if (uploadedPaths.length) {
      await supabase.from("product_images").delete().in("storage_path", uploadedPaths);
      await storage.remove(uploadedPaths);
    }
    console.error("Envoi de photo", error);
    return failure("L’envoi des photos a échoué. Réessayez.");
  }

  await recordAudit({ actorUserId: admin.userId, action: "product.images_added", entityType: "product", entityId: productId, metadata: { count: processed.length } });
  revalidateCatalog(product.slug, productId);
  return success(processed.length > 1 ? `${processed.length} photos ajoutées.` : "Photo ajoutée.");
}

async function loadImage(formData: FormData) {
  const imageId = uuidFrom(formData, "imageId");
  if (!imageId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, display_order")
    .eq("id", imageId)
    .maybeSingle();
  if (error || !data) return null;
  return { supabase, image: data };
}

async function afterImageChange(adminId: string, productId: string, action: string) {
  await recordAudit({ actorUserId: adminId, action, entityType: "product", entityId: productId });
  const product = await productSlug(productId);
  revalidateCatalog(product?.slug, productId);
}

const imageMissing = failure("Cette photo n’existe plus. Rechargez la page.");

export async function deleteProductImageAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const loaded = await loadImage(formData);
  if (!loaded) return imageMissing;
  const { supabase, image } = loaded;
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) {
    console.error("Suppression de photo", error.message);
    return failure("La photo n’a pas pu être supprimée. Réessayez.");
  }
  if (image.storage_path) {
    await createAdminClient().storage.from(BUCKET).remove([image.storage_path]);
  }
  await afterImageChange(admin.userId, image.product_id, "product.image_deleted");
  return success("Photo supprimée.");
}

// Réordonne : « cover » place la photo en premier, « up »/« down » l'échange
// avec sa voisine. Les ordres sont renumérotés 0..n pour rester compacts.
export async function moveProductImageAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const loaded = await loadImage(formData);
  if (!loaded) return imageMissing;
  const { supabase, image } = loaded;
  const direction = formData.get("direction");

  const { data: siblings, error } = await supabase
    .from("product_images")
    .select("id, display_order")
    .eq("product_id", image.product_id)
    .order("display_order")
    .order("id");
  if (error || !siblings) return failure("Lecture des photos impossible.");

  const ids = siblings.map((row) => row.id);
  const index = ids.indexOf(image.id);
  if (direction === "cover") {
    ids.splice(index, 1);
    ids.unshift(image.id);
  } else if (direction === "up" && index > 0) {
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
  } else if (direction === "down" && index < ids.length - 1) {
    [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
  } else {
    return failure("Déplacement impossible.");
  }

  for (const [position, id] of ids.entries()) {
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ display_order: position })
      .eq("id", id);
    if (updateError) {
      console.error("Ordre des photos", updateError.message);
      return failure("Le nouvel ordre n’a pas pu être enregistré. Rechargez la page.");
    }
  }
  await afterImageChange(admin.userId, image.product_id, "product.images_reordered");
  return success(direction === "cover" ? "Nouvelle photo de couverture." : "Ordre des photos mis à jour.");
}

export async function rotateProductImageAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const loaded = await loadImage(formData);
  if (!loaded) return imageMissing;
  const { supabase, image } = loaded;
  if (!image.storage_path) return failure("Seules les photos envoyées depuis l’admin peuvent être tournées.");

  const storage = createAdminClient().storage.from(BUCKET);
  const { data: blob, error: downloadError } = await storage.download(image.storage_path);
  if (downloadError || !blob) return failure("Lecture de la photo impossible.");

  const rotated = await normalizeProductImage(Buffer.from(await blob.arrayBuffer()), 90);
  // Nouveau fichier (nouvelle URL) pour contourner le cache d'un an.
  const path = `products/${image.product_id}/${randomUUID()}.webp`;
  const { error: uploadError } = await storage.upload(path, rotated.buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    console.error("Rotation de photo", uploadError.message);
    return failure("La photo tournée n’a pas pu être enregistrée. Réessayez.");
  }

  const { error } = await supabase
    .from("product_images")
    .update({
      url: storage.getPublicUrl(path).data.publicUrl,
      storage_path: path,
      width: rotated.width,
      height: rotated.height,
    })
    .eq("id", image.id);
  if (error) {
    await storage.remove([path]);
    console.error("Rotation de photo", error.message);
    return failure("La photo tournée n’a pas pu être enregistrée. Réessayez.");
  }
  await storage.remove([image.storage_path]);
  await afterImageChange(admin.userId, image.product_id, "product.image_rotated");
  return success("Photo tournée.");
}

export async function updateImageAltAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/produits");
  const loaded = await loadImage(formData);
  if (!loaded) return imageMissing;
  const { supabase, image } = loaded;
  const raw = formData.get("altText");
  const altText = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  const { error } = await supabase
    .from("product_images")
    .update({ alt_text: altText || null })
    .eq("id", image.id);
  if (error) {
    console.error("Description de photo", error.message);
    return failure("La description n’a pas pu être enregistrée.");
  }
  await afterImageChange(admin.userId, image.product_id, "product.image_alt_updated");
  return success("Description de la photo enregistrée.");
}
