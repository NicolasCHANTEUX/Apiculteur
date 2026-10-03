import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <PlaceholderPage eyebrow="Informations légales" title="Mentions légales">
      <p>
        Les informations légales de l&apos;entreprise (raison sociale, SIRET,
        hébergeur) seront publiées ici avant la mise en ligne.
      </p>
    </PlaceholderPage>
  );
}
