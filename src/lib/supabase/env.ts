export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

// En developpement sans Supabase, le site affiche les donnees d'exemple de
// la maquette (src/data/demo.ts) pour pouvoir travailler le visuel. Jamais
// en production : un deploiement non configure affiche l'etat "non configure".
export function isDemoMode(): boolean {
  return process.env.NODE_ENV === "development" && !getPublicSupabaseConfig();
}

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error(
      "Configuration Supabase absente. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
    );
  }

  return config;
}
