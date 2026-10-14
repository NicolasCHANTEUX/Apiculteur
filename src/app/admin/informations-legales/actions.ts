"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/data/audit";
import { requireAdmin } from "@/data/auth";
import { failure, success, type ActionResult } from "@/lib/admin/action-result";
import { checkLegalConfig, legalFields, parseLegalForm, type LegalConfig } from "@/lib/legal/config";
import { createClient } from "@/lib/supabase/server";

async function saveDraft(config: LegalConfig) {
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({
    key: "legal_draft",
    value: config,
    description: "Brouillon des informations legales (mentions, CGV, confidentialite).",
  });
  if (error) console.error("Brouillon légal", error.code, error.message);
  return !error;
}

function summary(config: LegalConfig) {
  const check = checkLegalConfig(config);
  const parts = [
    check.missing.length ? `${check.missing.length} champ${check.missing.length > 1 ? "s" : ""} à compléter` : null,
    check.placeholders.length ? `${check.placeholders.length} texte${check.placeholders.length > 1 ? "s" : ""} provisoire${check.placeholders.length > 1 ? "s" : ""}` : null,
    Object.keys(check.invalid).length ? `${Object.keys(check.invalid).length} valeur${Object.keys(check.invalid).length > 1 ? "s" : ""} à corriger` : null,
  ].filter(Boolean);
  return { check, text: parts.join(", ") };
}

export async function saveLegalDraftAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/informations-legales");
  const config = parseLegalForm(formData);
  if (!(await saveDraft(config))) return failure("Le brouillon n’a pas pu être enregistré.");
  await recordAudit({ actorUserId: admin.userId, action: "legal.draft_saved", entityType: "settings", entityId: null });
  revalidatePath("/admin/informations-legales");
  const { check, text } = summary(config);
  return success(check.ready ? "Brouillon enregistré : il est prêt à être approuvé." : `Brouillon enregistré. Reste : ${text}.`);
}

// Approbation : le brouillon (tel qu'affiché) est enregistré puis figé dans
// une nouvelle version, publiée sur le site (CAHIER §19).
export async function approveLegalAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("/admin/informations-legales");
  if (formData.get("confirm") !== "on") return failure("Cochez la case de vérification pour publier.");
  const config = parseLegalForm(formData);
  if (!(await saveDraft(config))) return failure("Le brouillon n’a pas pu être enregistré.");
  const { check, text } = summary(config);
  if (!check.ready) {
    const fields = [...check.missing, ...check.placeholders, ...(Object.keys(check.invalid) as (keyof typeof legalFields)[])]
      .slice(0, 4)
      .map((field) => legalFields[field].label.toLowerCase());
    revalidatePath("/admin/informations-legales");
    return failure(`Publication impossible : ${text} (${fields.join(", ")}…).`);
  }

  const supabase = await createClient();
  const { data: latest, error: readError } = await supabase.from("legal_versions").select("version").order("version", { ascending: false }).limit(1);
  if (readError) {
    console.error("Versions légales", readError.code, readError.message);
    return failure("La publication est momentanément impossible.");
  }
  const version = ((latest?.[0]?.version as number | undefined) ?? 0) + 1;
  const { error } = await supabase.from("legal_versions").insert({ version, config, approved_by: admin.userId });
  if (error) {
    console.error("Publication légale", error.code, error.message);
    return failure(error.code === "23505" ? "Une autre version vient d’être publiée : rechargez la page." : "La publication a échoué. Réessayez.");
  }
  await recordAudit({ actorUserId: admin.userId, action: "legal.approved", entityType: "settings", entityId: null, metadata: { version } });
  // Pages légales, pied de page et formulaires de tout le site.
  revalidatePath("/", "layout");
  return success(`Version ${version} publiée : mentions légales, CGV et confidentialité sont en ligne.`);
}
