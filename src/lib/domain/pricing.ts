export type PriceTier = {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | string;
};

export type PricedLine = {
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export function eurosToCents(value: number | string): number {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Le prix doit etre un nombre positif ou nul.");
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("La quantite doit etre un entier superieur ou egal a 1.");
  }
}

export function getUnitPriceCents(
  basePrice: number | string,
  tiers: PriceTier[],
  quantity: number,
): number {
  assertQuantity(quantity);

  const matchingTiers = tiers.filter(
    (tier) =>
      quantity >= tier.minQuantity &&
      (tier.maxQuantity === null || quantity <= tier.maxQuantity),
  );

  if (matchingTiers.length > 1) {
    throw new Error("Plusieurs paliers de prix correspondent a la quantite.");
  }

  return eurosToCents(matchingTiers[0]?.unitPrice ?? basePrice);
}

export function calculatePricedLine(
  basePrice: number | string,
  tiers: PriceTier[],
  quantity: number,
): PricedLine {
  const unitPriceCents = getUnitPriceCents(basePrice, tiers, quantity);

  return {
    quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
  };
}

export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("Le montant en centimes doit etre un entier.");
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
