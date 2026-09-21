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

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error(
      "Configuration Supabase absente. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
    );
  }

  return config;
}
