import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/admin-ui";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { ChevronLeftIcon } from "@/components/icons";
import { getLegalAdminState } from "@/data/admin/legal";
import { requireAdmin } from "@/data/auth";
import { legalContext, publicSiteUrl } from "@/data/legal";
import { legalDocument, type LegalDocumentKey } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "Aperçu légal" };

const keys: LegalDocumentKey[] = ["mentions-legales", "cgv", "confidentialite"];

// Aperçu du brouillon enregistré, valeurs provisoires surlignées. Réservé
// à l'admin ; rien n'est publié.
export default async function LegalPreviewPage(props: PageProps<"/admin/informations-legales/apercu/[document]">) {
  const { document } = await props.params;
  await requireAdmin(`/admin/informations-legales/apercu/${document}`);
  if (!keys.includes(document as LegalDocumentKey)) notFound();
  const state = await getLegalAdminState();
  const version = (state.published?.version ?? 0) + (state.changed ? 1 : 0);
  const context = legalContext({ version: Math.max(1, version), approvedAt: new Date().toISOString() }, publicSiteUrl());

  return (
    <div className="space-y-5">
      <Link href="/admin/informations-legales" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-honey-dark">
        <ChevronLeftIcon className="size-3.5" />
        Informations légales
      </Link>
      <Notice tone="info">
        Aperçu du brouillon enregistré : rien n’est publié. Les valeurs provisoires sont <mark className="rounded bg-orange-100 px-0.5 text-orange-900">surlignées</mark>.
      </Notice>
      <div className="rounded-2xl bg-cream py-2">
        <LegalDocumentView document={legalDocument(document as LegalDocumentKey, state.draft, context)} version={`Aperçu de la version ${Math.max(1, version)}.`} highlight />
      </div>
    </div>
  );
}
