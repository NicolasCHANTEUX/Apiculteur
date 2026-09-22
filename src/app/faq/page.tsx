import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <PlaceholderPage eyebrow="Questions fréquentes" title="FAQ">
      <p>
        Les réponses aux questions les plus fréquentes (délais, livraison,
        garanties sur les essaims, modalités de paiement) seront publiées ici
        prochainement. En attendant, n&apos;hésitez pas à nous écrire
        directement.
      </p>
    </PlaceholderPage>
  );
}
