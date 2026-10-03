// Validation du formulaire produit de l'admin, sans dépendance à Next ni à
// Supabase (testable). Produit la charge utile de admin_save_product.

export const productStatuses = ["draft", "published", "hidden", "sold_out", "archived"] as const;
export const priceVisibilities = ["visible", "hidden", "on_request"] as const;
export const purchaseModes = ["standard", "reservation", "quote"] as const;
export const conditions = ["new", "used", "second_choice"] as const;
export const deliveryModes = ["pickup_only", "deliverable", "quote"] as const;
export const stockDisplayModes = ["hidden", "exact", "status_label", "custom_message"] as const;
export const stockStatusLabels = [
  "available",
  "reservation_open",
  "limited",
  "coming_soon",
  "sold_out",
] as const;

export const MAX_TIERS = 10;
export const MAX_ATTRIBUTES = 20;
const MAX_PRICE_CENTS = 9_999_999_999; // numeric(10, 2)

export type ProductPayload = {
  category_id: string;
  name: string;
  slug: string;
  sku: string;
  tagline: string;
  short_description: string;
  long_description: string;
  base_price: string;
  compare_at_price: string;
  price_visibility: (typeof priceVisibilities)[number];
  purchase_mode: (typeof purchaseModes)[number];
  status: (typeof productStatuses)[number];
  featured: boolean;
  condition: (typeof conditions)[number];
  defect_description: string;
  sale_unit: string;
  delivery_mode: (typeof deliveryModes)[number];
  season_label: string;
  stock_quantity: string;
  low_stock_threshold: string;
  stock_display_mode: (typeof stockDisplayModes)[number];
  stock_status_label: string;
  stock_custom_message: string;
  display_order: string;
  seo_title: string;
  seo_description: string;
};

export type TierPayload = { min: number; max: number | null; price: string };
export type AttributePayload = { label: string; value: string; unit: string };

export type ProductFormResult =
  | {
      ok: true;
      product: ProductPayload;
      tiers: TierPayload[];
      attributes: AttributePayload[];
    }
  | { ok: false; errors: Record<string, string> };

type FormLike = {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** « 145 », « 145,5 », « 145.50 » → centimes ; null si invalide. */
export function parseEurosToCents(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) return null;
  const [units, decimals = ""] = value.split(".");
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  return cents <= MAX_PRICE_CENTS ? cents : null;
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function texts(form: FormLike, name: string): string[] {
  return form.getAll(name).map((value) => (typeof value === "string" ? value.trim() : ""));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseProductForm(form: FormLike): ProductFormResult {
  const errors: Record<string, string> = {};
  const fail = (field: string, message: string) => {
    errors[field] ??= message;
  };
  const limit = (field: string, value: string, max: number, min = 0) => {
    if (value.length < min || value.length > max) {
      fail(field, min > 0 ? `Entre ${min} et ${max} caractères.` : `${max} caractères au maximum.`);
    }
    return value;
  };

  const name = limit("name", text(form, "name"), 120, 2);
  const slug = text(form, "slug") || slugify(name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    fail("slug", "Uniquement des minuscules, chiffres et tirets (80 caractères au maximum).");
  }
  const sku = text(form, "sku");
  if (sku && !/^[A-Za-z0-9._-]{1,40}$/.test(sku)) {
    fail("sku", "Lettres, chiffres, points, tirets ou soulignés (40 au maximum).");
  }
  const categoryId = text(form, "categoryId");
  if (categoryId && !UUID.test(categoryId)) fail("categoryId", "Catégorie invalide.");

  const basePrice = parseEurosToCents(text(form, "basePrice"));
  if (basePrice === null) fail("basePrice", "Prix invalide (ex. 145 ou 145,50).");
  const compareRaw = text(form, "compareAtPrice");
  const compareAt = compareRaw ? parseEurosToCents(compareRaw) : null;
  if (compareRaw && compareAt === null) fail("compareAtPrice", "Prix invalide.");
  if (compareAt !== null && basePrice !== null && compareAt <= basePrice) {
    fail("compareAtPrice", "Le prix barré doit être supérieur au prix de vente.");
  }

  const integer = (field: string, raw: string, { min, max, optional }: { min: number; max: number; optional?: boolean }) => {
    if (!raw && optional) return "";
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) {
      fail(field, `Nombre entier entre ${min} et ${max}.`);
      return "";
    }
    return String(Number(raw));
  };

  const stockQuantity = integer("stockQuantity", text(form, "stockQuantity") || "0", { min: 0, max: 100_000 });
  const lowStock = integer("lowStockThreshold", text(form, "lowStockThreshold"), { min: 0, max: 100_000, optional: true });
  const displayOrder = integer("displayOrder", text(form, "displayOrder") || "0", { min: 0, max: 10_000 });

  const status = oneOf(text(form, "status"), productStatuses) ?? (fail("status", "Statut invalide."), "draft");
  const priceVisibility = oneOf(text(form, "priceVisibility"), priceVisibilities) ?? (fail("priceVisibility", "Choix invalide."), "visible");
  const purchaseMode = oneOf(text(form, "purchaseMode"), purchaseModes) ?? (fail("purchaseMode", "Choix invalide."), "standard");
  const condition = oneOf(text(form, "condition"), conditions) ?? (fail("condition", "Choix invalide."), "new");
  const deliveryMode = oneOf(text(form, "deliveryMode"), deliveryModes) ?? (fail("deliveryMode", "Choix invalide."), "quote");
  const stockDisplayMode = oneOf(text(form, "stockDisplayMode"), stockDisplayModes) ?? (fail("stockDisplayMode", "Choix invalide."), "hidden");

  const stockStatusLabel = text(form, "stockStatusLabel");
  if (stockDisplayMode === "status_label" && !oneOf(stockStatusLabel, stockStatusLabels)) {
    fail("stockStatusLabel", "Choisissez le libellé de disponibilité.");
  }
  const stockCustomMessage = limit("stockCustomMessage", text(form, "stockCustomMessage"), 80);
  if (stockDisplayMode === "custom_message" && !stockCustomMessage) {
    fail("stockCustomMessage", "Renseignez le message affiché.");
  }

  // Paliers : lignes vides ignorées, triées par quantité minimale.
  const mins = texts(form, "tierMin");
  const maxs = texts(form, "tierMax");
  const prices = texts(form, "tierPrice");
  const tiers: TierPayload[] = [];
  mins.forEach((rawMin, index) => {
    const rawMax = maxs[index] ?? "";
    const rawPrice = prices[index] ?? "";
    if (!rawMin && !rawMax && !rawPrice) return;
    const min = /^\d+$/.test(rawMin) ? Number(rawMin) : NaN;
    const max = rawMax === "" ? null : /^\d+$/.test(rawMax) ? Number(rawMax) : NaN;
    const price = parseEurosToCents(rawPrice);
    if (!(min >= 1) || (max !== null && !(max >= min)) || price === null) {
      fail("tiers", `Palier ${index + 1} : quantités entières (max ≥ min) et prix valide.`);
      return;
    }
    tiers.push({ min, max, price: centsToDecimal(price) });
  });
  tiers.sort((a, b) => a.min - b.min);
  if (tiers.length > MAX_TIERS) fail("tiers", `${MAX_TIERS} paliers au maximum.`);
  for (let i = 1; i < tiers.length; i += 1) {
    const previous = tiers[i - 1];
    if (previous.max === null || previous.max >= tiers[i].min) {
      fail("tiers", "Les paliers se chevauchent : chaque palier doit commencer après la fin du précédent.");
    }
  }

  const labels = texts(form, "attrLabel");
  const values = texts(form, "attrValue");
  const units = texts(form, "attrUnit");
  const attributes: AttributePayload[] = [];
  labels.forEach((label, index) => {
    const value = values[index] ?? "";
    const unit = units[index] ?? "";
    if (!label && !value && !unit) return;
    if (!label || label.length > 60 || !value || value.length > 120 || unit.length > 20) {
      fail("attributes", `Caractéristique ${index + 1} : libellé (60) et valeur (120) obligatoires, unité (20).`);
      return;
    }
    attributes.push({ label, value, unit });
  });
  if (attributes.length > MAX_ATTRIBUTES) fail("attributes", `${MAX_ATTRIBUTES} caractéristiques au maximum.`);

  const product: ProductPayload = {
    category_id: categoryId,
    name,
    slug,
    sku,
    tagline: limit("tagline", text(form, "tagline"), 90),
    short_description: limit("shortDescription", text(form, "shortDescription"), 300),
    long_description: limit("longDescription", text(form, "longDescription"), 5000),
    base_price: basePrice === null ? "" : centsToDecimal(basePrice),
    compare_at_price: compareAt === null ? "" : centsToDecimal(compareAt),
    price_visibility: priceVisibility,
    purchase_mode: purchaseMode,
    status,
    featured: form.get("featured") === "on",
    condition,
    defect_description: limit("defectDescription", text(form, "defectDescription"), 2000),
    sale_unit: limit("saleUnit", text(form, "saleUnit") || "unité", 30, 1),
    delivery_mode: deliveryMode,
    season_label: limit("seasonLabel", text(form, "seasonLabel"), 60),
    stock_quantity: stockQuantity,
    low_stock_threshold: lowStock,
    stock_display_mode: stockDisplayMode,
    stock_status_label: stockDisplayMode === "status_label" ? stockStatusLabel : "",
    stock_custom_message: stockDisplayMode === "custom_message" ? stockCustomMessage : "",
    display_order: displayOrder,
    seo_title: limit("seoTitle", text(form, "seoTitle"), 70),
    seo_description: limit("seoDescription", text(form, "seoDescription"), 160),
  };

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, product, tiers, attributes };
}
