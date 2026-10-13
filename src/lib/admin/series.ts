// Séries temporelles du tableau de bord (jours calendaires de Paris), sans
// dépendance à Next ni à Supabase (testables).

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** « 2026-10-13 » : jour calendaire de Paris d'un instant. */
export function parisDay(value: Date | string): string {
  return dayKey.format(typeof value === "string" ? new Date(value) : value);
}

/** Les `count` derniers jours de Paris, du plus ancien à aujourd'hui inclus. */
export function lastDays(count: number, now: Date = new Date()): string[] {
  // Ancrage à midi UTC : jamais de jour sauté ou doublé au changement d'heure.
  const today = new Date(`${parisDay(now)}T12:00:00Z`).getTime();
  return Array.from({ length: count }, (_, index) =>
    new Date(today - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Additionne des événements par jour ; ceux hors de la fenêtre sont ignorés. */
export function bucketByDay(
  days: string[],
  events: { at: string; value?: number }[],
): number[] {
  const index = new Map(days.map((day, position) => [day, position]));
  const totals = days.map(() => 0);
  for (const event of events) {
    const position = index.get(parisDay(event.at));
    if (position !== undefined) totals[position] += event.value ?? 1;
  }
  return totals;
}

export type PeriodSummary = {
  total: number;
  previous: number;
  /** Variation en %, null quand la période précédente est vide. */
  change: number | null;
};

/** Total des `span` derniers points et de la période d'avant (même durée). */
export function summarizePeriod(values: number[], span: number): PeriodSummary {
  const sum = (list: number[]) => list.reduce((total, value) => total + value, 0);
  const total = sum(values.slice(-span));
  const previous = sum(values.slice(-2 * span, -span));
  return {
    total,
    previous,
    change: previous > 0 ? Math.round(((total - previous) / previous) * 100) : null,
  };
}

/** Maximum d'axe « rond » (1, 2, 2,5, 5 × 10ⁿ) au-dessus de la valeur. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

export type Bucket = { start: string; end: string; value: number };

/**
 * Regroupe des valeurs journalières par paquets de `size` jours en partant du
 * dernier jour : le paquet le plus ancien peut être incomplet (ses dates
 * l'indiquent).
 */
export function groupDays(days: string[], values: number[], size: number): Bucket[] {
  const buckets: Bucket[] = [];
  for (let end = days.length; end > 0; end -= size) {
    const start = Math.max(0, end - size);
    buckets.unshift({
      start: days[start],
      end: days[end - 1],
      value: values.slice(start, end).reduce((total, value) => total + value, 0),
    });
  }
  return buckets;
}
