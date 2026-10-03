import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <PlaceholderPage
      eyebrow="Informations légales"
      title="Politique de confidentialité"
    >
      <p>
        La politique de confidentialité (RGPD, données collectées, durée de
        conservation) sera publiée ici avant la mise en ligne.
      </p>
    </PlaceholderPage>
  );
}
