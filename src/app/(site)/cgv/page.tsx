import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function CgvPage() {
  return (
    <PlaceholderPage
      eyebrow="Informations légales"
      title="Conditions générales de vente"
    >
      <p>Le texte complet des CGV sera publié ici avant la mise en ligne.</p>
    </PlaceholderPage>
  );
}
