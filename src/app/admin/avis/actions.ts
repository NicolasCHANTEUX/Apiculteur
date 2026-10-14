"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { createClient } from "@/lib/supabase/server";

// Avis clients visibles ou non sur le site : page Avis, lien du menu,
// section de l'accueil, notes du catalogue et des fiches produit.
export async function setReviewsPublicAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/avis");
  const visible = formData.get("value") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "reviews_public", value: visible, description: "Avis clients visibles sur le site (true/false)." });
  if (error) {
    console.error("Réglage reviews_public", error.code, error.message);
    return failure("Le réglage n’a pas pu être enregistré.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "settings.reviews_public", entityType: "settings", entityId: null, metadata: { visible } });
  // Tout le site : le menu figure sur chaque page, y compris les pages statiques.
  revalidatePath("/", "layout");
  return success(visible ? "Les avis sont maintenant visibles sur le site." : "Les avis sont masqués sur le site.");
}
