import "server-only";

import { requireAdmin } from "@/data/auth";
import { checkLegalConfig, defaultLegalConfig, normalizeLegalConfig, type LegalConfig } from "@/lib/legal/config";
import { createClient } from "@/lib/supabase/server";

export type LegalAdminState = {
  /** Migration du lot 9 appliquée. */
  available: boolean;
  draft: LegalConfig;
  draftSavedAt: string | null;
  published: { version: number; approvedAt: string } | null;
  versions: { version: number; approvedAt: string }[];
  /** Le brouillon diffère de la version publiée. */
  changed: boolean;
};

// Brouillon (app_settings.legal_draft) et versions approuvées. Sans
// brouillon, on repart de la dernière version publiée, sinon des valeurs
// par défaut.
export async function getLegalAdminState(): Promise<LegalAdminState> {
  await requireAdmin("/admin/informations-legales");
  const supabase = await createClient();
  const [draftResult, versionsResult] = await Promise.all([
    supabase.from("app_settings").select("value, updated_at").eq("key", "legal_draft").maybeSingle(),
    supabase.from("legal_versions").select("version, approved_at, config").order("version", { ascending: false }).limit(50),
  ]);
  if (draftResult.error) throw new Error(`Brouillon légal: ${draftResult.error.message}`);
  const missingTable = versionsResult.error && (versionsResult.error.code === "PGRST205" || versionsResult.error.code === "42P01");
  if (versionsResult.error && !missingTable) throw new Error(`Versions légales: ${versionsResult.error.message}`);

  const versions = (versionsResult.data ?? []).map((row) => ({ version: row.version as number, approvedAt: row.approved_at as string, config: row.config }));
  const latest = versions[0] ?? null;
  const draft = draftResult.data ? normalizeLegalConfig(draftResult.data.value) : latest ? normalizeLegalConfig(latest.config) : defaultLegalConfig;
  return {
    available: !missingTable,
    draft,
    draftSavedAt: (draftResult.data?.updated_at as string | undefined) ?? null,
    published: latest ? { version: latest.version, approvedAt: latest.approvedAt } : null,
    versions: versions.map(({ version, approvedAt }) => ({ version, approvedAt })),
    changed: latest ? JSON.stringify(normalizeLegalConfig(latest.config)) !== JSON.stringify(draft) : true,
  };
}

export { checkLegalConfig };
