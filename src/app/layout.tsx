import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { connection } from "next/server";
import { site } from "@/lib/site";
import { isDemoMode } from "@/lib/supabase/env";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  style: ["normal", "italic"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — Essaims élevés avec soin`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
};

// En-tête et pied de page publics : app/(site)/layout.tsx.
// Espace d'administration : app/admin/layout.tsx.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // CSP à nonce (src/proxy.ts) : chaque page est rendue à la requête, pour
  // que Next.js marque ses scripts avec le nonce de cette requête.
  await connection();
  return (
    <html
      lang="fr"
      className={`h-full antialiased ${dmSans.variable} ${playfair.variable}`}
    >
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {isDemoMode() ? (
          <p className="bg-ink px-4 py-1.5 text-center text-xs text-white/80">
            Mode démo : Supabase n&apos;est pas configuré, le site affiche les
            données d&apos;exemple de la maquette.
          </p>
        ) : null}
        {children}
      </body>
    </html>
  );
}
