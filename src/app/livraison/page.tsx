import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Livraison" };

export default function LivraisonPage() {
  return (
    <PlaceholderPage eyebrow="Informations" title="Livraison">
      <p>
        Les zones de livraison, les délais et les frais associés seront
        détaillés ici. Pour les commandes importantes ou éloignées, chaque
        situation est étudiée personnellement avant confirmation.
      </p>
    </PlaceholderPage>
  );
}
