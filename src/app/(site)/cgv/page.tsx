import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function CgvPage() {
  return <LegalPage document="cgv" />;
}
