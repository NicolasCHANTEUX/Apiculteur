// Formulaire d'une zone de livraison (admin). Sans dépendance à Next
// (testable).

import { parseEurosToCents } from "../catalog/product-form.ts";
import { parsePrefixes } from "./rules.ts";

type FormLike = { get(name: string): FormDataEntryValue | null };

export type ZoneInput = {
  name: string;
  active: boolean;
  countries: string[];
  includePrefixes: string[];
  excludePrefixes: string[];
  feeCents: number;
  extraUnitFeeCents: number;
  maxDistanceKm: number | null;
};

export function parseZoneForm(form: FormLike): { ok: true; value: ZoneInput } | { ok: false; errors: Record<string, string> } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const errors: Record<string, string> = {};

  const name = text("name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) errors.name = "Nom de 2 à 80 caractères.";

  const countries = [...new Set(text("countries").toUpperCase().split(/[\s,;]+/).filter(Boolean))];
  if (!countries.length || countries.some((code) => !/^[A-Z]{2}$/.test(code)) || countries.length > 20) {
    errors.countries = "Codes pays ISO à deux lettres, par exemple FR.";
  }

  const include = parsePrefixes(text("includePrefixes"));
  const exclude = parsePrefixes(text("excludePrefixes"));
  if (include.invalid.length) errors.includePrefixes = `Préfixes invalides : ${include.invalid.join(", ")} (chiffres uniquement).`;
  if (exclude.invalid.length) errors.excludePrefixes = `Préfixes invalides : ${exclude.invalid.join(", ")} (chiffres uniquement).`;

  const fee = parseEurosToCents(text("fee") || "0");
  if (fee === null) errors.fee = "Montant invalide.";
  const extra = parseEurosToCents(text("extraUnitFee") || "0");
  if (extra === null) errors.extraUnitFee = "Montant invalide.";

  const rawDistance = text("maxDistanceKm");
  const maxDistanceKm = rawDistance ? Number(rawDistance) : null;
  if (maxDistanceKm !== null && (!Number.isInteger(maxDistanceKm) || maxDistanceKm < 1 || maxDistanceKm > 2000)) {
    errors.maxDistanceKm = "Distance en km, de 1 à 2 000.";
  }

  const active = form.get("active") === "on" || form.get("active") === "true";
  // Une zone ne s'active qu'avec un tarif strictement positif (CAHIER §9).
  if (active && fee !== null && fee <= 0) errors.fee = "Indiquez un tarif pour activer la zone.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      active,
      countries,
      includePrefixes: include.prefixes,
      excludePrefixes: exclude.prefixes,
      feeCents: fee ?? 0,
      extraUnitFeeCents: extra ?? 0,
      maxDistanceKm,
    },
  };
}
