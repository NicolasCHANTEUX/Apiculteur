"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
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

export type ActionResult = { status: "idle" | "error" | "success"; message: string };

function uuidFrom(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/produits");
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  revalidatePath("/");
  if (slug) revalidatePath(`/produits/${slug}`);
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
  revalidateCatalog(parsed.product.slug);
  redirect(`/admin/produits/${savedId}?enregistre=1`);
}

const quickStatuses = ["published", "hidden", "archived", "draft"] as const;

export async function setProductStatusAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  const status = formData.get("status");
  if (!id || !quickStatuses.includes(status as (typeof quickStatuses)[number])) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`Changement de statut impossible: ${error.message}`);

  await recordAudit({ actorUserId: admin.userId, action: "product.status_changed", entityType: "product", entityId: id, metadata: { status } });
  revalidateCatalog(data?.slug);
}

export async function updateStockAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const id = uuidFrom(formData, "id");
  const raw = formData.get("stockQuantity");
  const quantity = typeof raw === "string" && /^\d{1,6}$/.test(raw.trim()) ? Number(raw) : null;
  if (!id || quantity === null) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ stock_quantity: quantity })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(`Mise à jour du stock impossible: ${error.message}`);

  await recordAudit({ actorUserId: admin.userId, action: "product.stock_updated", entityType: "product", entityId: id, metadata: { stock_quantity: quantity } });
  revalidateCatalog(data?.slug);
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
  if (!productId) return { status: "error", message: "Produit invalide." };
  if (files.length === 0) return { status: "error", message: "Choisissez au moins une photo." };

  const supabase = await createClient();
  const { data: existing, error: countError } = await supabase
    .from("product_images")
    .select("display_order")
    .eq("product_id", productId);
  if (countError) return { status: "error", message: "Lecture des photos impossible." };
  if ((existing?.length ?? 0) + files.length > MAX_IMAGES_PER_PRODUCT) {
    return { status: "error", message: `${MAX_IMAGES_PER_PRODUCT} photos au maximum par produit.` };
  }

  const product = await productSlug(productId);
  if (!product) return { status: "error", message: "Produit introuvable." };

  // Toutes les photos sont validées et converties avant le premier envoi.
  let processed: Awaited<ReturnType<typeof normalizeProductImage>>[];
  try {
    processed = await Promise.all(
      files.map(async (file) => normalizeProductImage(Buffer.from(await file.arrayBuffer()))),
    );
  } catch (error) {
    if (error instanceof ImageRejectedError) return { status: "error", message: error.message };
    console.error("Traitement d'image", error);
    return { status: "error", message: "Une photo n’a pas pu être traitée." };
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
    return { status: "error", message: "L’envoi des photos a échoué. Réessayez." };
  }

  await recordAudit({ actorUserId: admin.userId, action: "product.images_added", entityType: "product", entityId: productId, metadata: { count: processed.length } });
  revalidateCatalog(product.slug);
  revalidatePath(`/admin/produits/${productId}`);
  return { status: "success", message: processed.length > 1 ? `${processed.length} photos ajoutées.` : "Photo ajoutée." };
}

async function loadImage(formData: FormData) {
  const imageId = uuidFrom(formData, "imageId");
  if (!imageId) throw new Error("Photo invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, display_order")
    .eq("id", imageId)
    .maybeSingle();
  if (error || !data) throw new Error("Photo introuvable.");
  return { supabase, image: data };
}

async function afterImageChange(adminId: string, productId: string, action: string) {
  await recordAudit({ actorUserId: adminId, action, entityType: "product", entityId: productId });
  const product = await productSlug(productId);
  revalidateCatalog(product?.slug);
  revalidatePath(`/admin/produits/${productId}`);
}

export async function deleteProductImageAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const { supabase, image } = await loadImage(formData);
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) throw new Error(`Suppression impossible: ${error.message}`);
  if (image.storage_path) {
    await createAdminClient().storage.from(BUCKET).remove([image.storage_path]);
  }
  await afterImageChange(admin.userId, image.product_id, "product.image_deleted");
}

// Réordonne : « cover » place la photo en premier, « up »/« down » l'échange
// avec sa voisine. Les ordres sont renumérotés 0..n pour rester compacts.
export async function moveProductImageAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const { supabase, image } = await loadImage(formData);
  const direction = formData.get("direction");

  const { data: siblings, error } = await supabase
    .from("product_images")
    .select("id, display_order")
    .eq("product_id", image.product_id)
    .order("display_order")
    .order("id");
  if (error || !siblings) throw new Error("Lecture des photos impossible.");

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
    return;
  }

  for (const [position, id] of ids.entries()) {
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ display_order: position })
      .eq("id", id);
    if (updateError) throw new Error(`Réorganisation impossible: ${updateError.message}`);
  }
  await afterImageChange(admin.userId, image.product_id, "product.images_reordered");
}

export async function rotateProductImageAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const { supabase, image } = await loadImage(formData);
  if (!image.storage_path) throw new Error("Seules les photos envoyées depuis l’admin peuvent être tournées.");

  const storage = createAdminClient().storage.from(BUCKET);
  const { data: blob, error: downloadError } = await storage.download(image.storage_path);
  if (downloadError || !blob) throw new Error("Lecture de la photo impossible.");

  const rotated = await normalizeProductImage(Buffer.from(await blob.arrayBuffer()), 90);
  // Nouveau fichier (nouvelle URL) pour contourner le cache d'un an.
  const path = `products/${image.product_id}/${randomUUID()}.webp`;
  const { error: uploadError } = await storage.upload(path, rotated.buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw new Error(`Envoi impossible: ${uploadError.message}`);

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
    throw new Error(`Mise à jour impossible: ${error.message}`);
  }
  await storage.remove([image.storage_path]);
  await afterImageChange(admin.userId, image.product_id, "product.image_rotated");
}

export async function updateImageAltAction(formData: FormData) {
  const admin = await requireAdmin("/admin/produits");
  const { supabase, image } = await loadImage(formData);
  const raw = formData.get("altText");
  const altText = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  const { error } = await supabase
    .from("product_images")
    .update({ alt_text: altText || null })
    .eq("id", image.id);
  if (error) throw new Error(`Mise à jour impossible: ${error.message}`);
  await afterImageChange(admin.userId, image.product_id, "product.image_alt_updated");
}
