import type { MetadataRoute } from "next";
import { logoColors } from "@/lib/logo";
import { site } from "@/lib/site";

// Manifest de l'application (installation sur l'écran d'accueil). Icônes
// produites par scripts/generate-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: logoColors.cream,
    theme_color: logoColors.cream,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
