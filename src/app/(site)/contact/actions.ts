"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getPublicProductBySlug } from "@/data/catalog";
import { scheduleRequestEmails } from "@/data/email";
import { REQUEST_PHOTOS_BUCKET, requestFormReady, requestPhotosReady } from "@/data/requests";
import { MAX_REQUEST_PHOTOS, MAX_REQUEST_PHOTO_BYTES } from "@/lib/images/limits";
import { ImageRejectedError, normalizeRequestPhoto } from "@/lib/images/product-image";
import { parseContactRequest, requestKinds } from "@/lib/requests/form";
import { RateLimitError, currentClientIp, enforceRateLimit } from "@/lib/security/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContactRequestState = {
  status: "idle" | "error";
  message: string;
  errors: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,120}$/;
const UNAVAILABLE = "L’envoi est momentanément impossible. Réessayez dans un instant, ou écrivez-moi directement par email.";

function failure(message: string, errors: Record<string, string> = {}): ContactRequestState {
  return { status: "error", message, errors };
}

function thanks(reference: string, kind: keyof typeof requestKinds): never {
  redirect(`/contact/merci?ref=${encodeURIComponent(reference)}&type=${requestKinds[kind].slug}`);
}

// Demande envoyée depuis la page contact (ROADMAP lot 7) : validée,
// limitée en débit, enregistrée par le serveur avec ses photos (réencodées,
// bucket privé), puis accusé de réception et alerte par email.
export async function submitContactRequestAction(
  _previous: ContactRequestState,
  formData: FormData,
): Promise<ContactRequestState> {
  // Champ piège invisible : un robot qui le remplit croit avoir réussi.
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.trim()) redirect("/contact/merci");

  if (!(await requestFormReady())) return failure(UNAVAILABLE);

  const key = formData.get("submissionKey");
  if (typeof key !== "string" || !UUID.test(key)) return failure(UNAVAILABLE);

  // Produit d'où vient la demande : seul un produit publié est retenu.
  const slug = formData.get("product");
  let product: { id: string; name: string; sku: string | null } | null = null;
  if (typeof slug === "string" && SLUG.test(slug)) {
    try {
      const found = await getPublicProductBySlug(slug);
      if (found.kind === "ready" && found.product) product = { id: found.product.id, name: found.product.name, sku: found.product.sku };
    } catch (error) {
      console.error("Demande : produit", error instanceof Error ? error.message : error);
    }
  }

  const parsed = parseContactRequest(formData, product?.name ?? null);
  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const errors = parsed.ok ? {} : { ...parsed.errors };
  if (files.length > MAX_REQUEST_PHOTOS) errors.photos = `${MAX_REQUEST_PHOTOS} photos au maximum.`;
  else if (files.some((file) => file.size > MAX_REQUEST_PHOTO_BYTES)) errors.photos = "Chaque photo doit faire 5 Mo au maximum.";
  if (!parsed.ok || Object.keys(errors).length) return failure("Certains champs sont à corriger.", errors);
  const request = parsed.value;

  try {
    const ip = await currentClientIp();
    await enforceRateLimit({ scope: "contact-request-ip", identifier: ip, limit: 6, windowSeconds: 3600 });
    await enforceRateLimit({ scope: "contact-request", identifier: `${ip}|${request.email}`, limit: 3, windowSeconds: 3600 });
  } catch (error) {
    if (error instanceof RateLimitError) return failure("Plusieurs messages viennent d’être envoyés : patientez un peu avant de réessayer.");
    console.error("Demande : limitation indisponible", error);
    return failure(UNAVAILABLE);
  }

  // Les photos ne partent que vers un bucket vérifié privé.
  if (files.length && !(await requestPhotosReady())) {
    return failure("Les photos ne peuvent pas être reçues pour le moment : envoyez votre message sans photo, ou par email.", {
      photos: "Retirez les photos pour envoyer votre message.",
    });
  }

  let photos: Awaited<ReturnType<typeof normalizeRequestPhoto>>[];
  try {
    photos = await Promise.all(files.map(async (file) => normalizeRequestPhoto(Buffer.from(await file.arrayBuffer()))));
  } catch (error) {
    if (error instanceof ImageRejectedError) return failure("Une photo n’a pas pu être utilisée.", { photos: error.message });
    console.error("Demande : traitement de photo", error);
    return failure("Une photo n’a pas pu être utilisée.", { photos: "Essayez avec une autre photo (JPG, PNG ou WebP)." });
  }

  const supabase = createAdminClient();
  const { data: inserted, error } = await supabase
    .from("contact_requests")
    .upsert(
      {
        submission_key: key,
        kind: request.kind,
        name: request.name,
        email: request.email,
        phone: request.phone || null,
        subject: request.subject,
        message: request.message,
        details: request.details,
        product_id: product?.id ?? null,
        product_name: product ? `${product.name}${product.sku ? ` (réf. ${product.sku})` : ""}`.slice(0, 200) : null,
        consent_at: new Date().toISOString(),
      },
      { onConflict: "submission_key", ignoreDuplicates: true },
    )
    .select("id, reference");
  if (error) {
    console.error("Demande : enregistrement", error.code, error.message);
    return failure(UNAVAILABLE);
  }

  const created = inserted?.[0] as { id: string; reference: string } | undefined;
  if (!created) {
    // Déjà reçue (double clic, page renvoyée) : même confirmation.
    const { data: existing } = await supabase.from("contact_requests").select("reference").eq("submission_key", key).maybeSingle();
    if (existing?.reference) thanks(existing.reference as string, request.kind);
    return failure(UNAVAILABLE);
  }

  if (photos.length) {
    const storage = supabase.storage.from(REQUEST_PHOTOS_BUCKET);
    const uploaded: string[] = [];
    try {
      for (const [position, photo] of photos.entries()) {
        const path = `requests/${created.id}/${randomUUID()}.webp`;
        const { error: uploadError } = await storage.upload(path, photo.buffer, { contentType: "image/webp", upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push(path);
        const { error: rowError } = await supabase.from("contact_request_photos").insert({
          request_id: created.id,
          storage_path: path,
          width: photo.width,
          height: photo.height,
          byte_size: photo.buffer.byteLength,
          position,
        });
        if (rowError) throw rowError;
      }
    } catch (uploadError) {
      // Tout ou rien : le visiteur peut réessayer avec la même clé.
      console.error("Demande : envoi des photos", uploadError instanceof Error ? uploadError.message : uploadError);
      if (uploaded.length) await storage.remove(uploaded);
      await supabase.from("contact_requests").delete().eq("id", created.id);
      return failure("L’envoi des photos a échoué. Réessayez, ou envoyez votre message sans photo.");
    }
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_user_id: null,
    action: "request.received",
    entity_type: "contact_request",
    entity_id: created.id,
    metadata: { reference: created.reference, kind: request.kind },
  });
  if (auditError) console.error("Demande : journal", auditError.message);

  await scheduleRequestEmails(created.id, ["request_received", "request_new_admin"]);
  thanks(created.reference, request.kind);
}
