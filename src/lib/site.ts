// Coordonnees et identite affichees sur le site. Valeurs reprises de la
// maquette Figma : a remplacer par les vraies informations de l'apiculteur.
export const site = {
  name: "Ruchers de Normandie",
  shortName: "Ruchers",
  tagline: "de Normandie",
  owner: {
    firstName: "Marc",
    fullName: "Marc Dupont",
    since: 2009,
  },
  email: "contact@ruchers-normandie.fr",
  phone: "06 12 34 56 78",
  phoneHref: "tel:+33612345678",
  region: "Normandie, France",
  // Bandeau du hero de la page d'accueil.
  seasonBanner: "Saison 2026 ouverte",
  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
  },
} as const;

export const mainNav = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Nos essaims" },
  { href: "/a-propos", label: "À propos" },
  { href: "/avis", label: "Avis clients" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const infoNav = [
  { href: "/faq", label: "FAQ" },
  { href: "/livraison", label: "Livraison" },
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
] as const;
