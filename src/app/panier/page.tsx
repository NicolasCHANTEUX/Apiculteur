import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";
import { buttonStyles } from "@/components/ui";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <PlaceholderPage eyebrow="Panier" title="Votre panier">
      <p>
        La commande en ligne arrive bientôt. En attendant, parcourez le
        catalogue et contactez-moi pour réserver vos essaims.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/catalogue" className={buttonStyles.primary}>
          Voir les essaims
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-12 items-center rounded-lg border border-line px-[22px] text-[15px] font-medium text-ink transition hover:bg-sand"
        >
          Me contacter
        </Link>
      </div>
    </PlaceholderPage>
  );
}
