// Géocodage d'une adresse française (H5) : service de l'IGN (Géoplateforme,
// successeur de la Base Adresse Nationale), puis l'ancienne adresse de
// l'API en secours. Gratuit, sans clé. Adresse mal reconnue : repli sur la
// commune, assez précis pour une distance à vol d'oiseau. Sans dépendance
// à Next (testable avec un faux `fetch`).

export type Geocoded = { lat: number; lng: number; label: string; precision: "address" | "municipality" };

const ENDPOINTS = ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"];

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { label?: string; score?: number; postcode?: string; type?: string };
};

async function search(fetchImpl: typeof fetch, params: Record<string, string>): Promise<Feature | null> {
  const query = new URLSearchParams({ limit: "1", ...params }).toString();
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetchImpl(`${endpoint}?${query}`, { signal: AbortSignal.timeout(3500), headers: { accept: "application/json" } });
      if (!response.ok) continue;
      const data = (await response.json()) as { features?: Feature[] };
      return data.features?.[0] ?? null;
    } catch {
      // Service suivant.
    }
  }
  return null;
}

function point(feature: Feature | null, postalCode: string, minScore: number, precision: Geocoded["precision"]): Geocoded | null {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties;
  if (!coordinates || !properties || (properties.score ?? 0) < minScore) return null;
  // Le code postal trouvé doit être celui demandé (homonymes).
  if (properties.postcode && properties.postcode !== postalCode) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: properties.label ?? "", precision };
}

export async function geocodeFrenchAddress(
  address: { line1: string; postalCode: string; city: string },
  fetchImpl: typeof fetch = fetch,
): Promise<Geocoded | null> {
  const postalCode = address.postalCode.replace(/\s/g, "");
  if (!/^\d{5}$/.test(postalCode)) return null;
  if (address.line1.trim()) {
    const exact = point(
      await search(fetchImpl, { q: `${address.line1} ${postalCode} ${address.city}`.slice(0, 200), postcode: postalCode, index: "address" }),
      postalCode,
      0.6,
      "address",
    );
    if (exact) return exact;
  }
  return point(
    await search(fetchImpl, { q: `${postalCode} ${address.city}`.slice(0, 200), type: "municipality", index: "address" }),
    postalCode,
    0.4,
    "municipality",
  );
}
