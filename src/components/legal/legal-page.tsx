import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { getPublishedLegal, legalContext, publicSiteUrl } from "@/data/legal";
import { legalDocument, versionLine, type LegalDocumentKey } from "@/lib/legal/documents";

// Page légale publique : générée depuis la dernière version approuvée ;
// introuvable tant qu'aucune version ne l'est (CAHIER §19).
export async function LegalPage({ document: key }: { document: LegalDocumentKey }) {
  const published = await getPublishedLegal();
  if (!published) notFound();
  const context = legalContext(published, publicSiteUrl());
  return <LegalDocumentView document={legalDocument(key, published.config, context)} version={versionLine(context)} />;
}
