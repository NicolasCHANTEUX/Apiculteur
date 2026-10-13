"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { niceMax, type Bucket } from "@/lib/admin/series";

// La ligne utilise le miel foncé (3,2:1 sur blanc) ; la surface n'est qu'un
// voile du miel. Une seule série : le titre du graphique la nomme.
const LINE = "#c0841c";
const WASH = "#d99a2b";
const W = 1000;
const H = 300;
const TOP = 8;

const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });

function toDate(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

/** « mardi 13 octobre », ou « du 5 au 11 oct. » pour un paquet de plusieurs jours. */
export function bucketLabel(bucket: Bucket) {
  if (bucket.start === bucket.end) {
    const label = longDate.format(toDate(bucket.start));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `Du ${shortDate.format(toDate(bucket.start))} au ${shortDate.format(toDate(bucket.end))}`;
}

/** Courbe monotone (Fritsch–Carlson) : lisse, sans dépasser les points. */
function monotonePath(points: [number, number][]) {
  if (points.length < 2) return points.length ? `M${points[0][0]},${points[0][1]}` : "";
  const n = points.length;
  const dx = points.slice(1).map(([x], i) => x - points[i][0]);
  const slope = points.slice(1).map(([, y], i) => (y - points[i][1]) / dx[i]);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += `C${x0 + h},${y0 + tangent[i] * h} ${x1 - h},${y1 - tangent[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({
  buckets,
  format,
  axisFormat,
  label,
  emptyMessage,
}: {
  buckets: Bucket[];
  /** Valeur exacte (infobulle). */
  format: (value: number) => string;
  /** Valeur compacte (graduations). */
  axisFormat: (value: number) => string;
  /** Ce que mesure la courbe, pour les lecteurs d'écran (« Commandes par jour »). */
  label: string;
  emptyMessage: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const values = buckets.map((bucket) => bucket.value);
  const max = niceMax(Math.max(...values));
  const empty = values.every((value) => value === 0);
  const x = (index: number) => (values.length > 1 ? (index / (values.length - 1)) * W : W / 2);
  const y = (value: number) => H - (value / max) * (H - TOP);
  const line = monotonePath(values.map((value, index) => [x(index), y(value)]));
  const area = `${line}L${W},${H}L0,${H}Z`;

  // Repères de l'axe : chaque point s'il y en a 7 ou moins, sinon ~5 repères.
  const daily = buckets.every((bucket) => bucket.start === bucket.end);
  const step = buckets.length <= 7 ? 1 : Math.ceil((buckets.length - 1) / 4);
  const ticks = buckets.map((_, index) => index).filter((index) => (buckets.length - 1 - index) % step === 0);
  const tickLabel = (bucket: Bucket) =>
    daily && buckets.length <= 7 ? weekday.format(toDate(bucket.start)) : shortDate.format(toDate(bucket.start));

  function pick(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (values.length - 1)));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const last = values.length - 1;
    const current = active ?? last;
    const next =
      event.key === "ArrowLeft" ? Math.max(0, current - 1)
      : event.key === "ArrowRight" ? Math.min(last, current + 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next !== null) {
      event.preventDefault();
      setActive(next);
    }
  }

  const activeX = active === null ? 0 : (x(active) / W) * 100;
  const activeY = active === null ? 0 : (y(values[active]) / H) * 100;
  // L'infobulle se place à côté du curseur, du côté où il reste de la place.
  const flip = activeX > 62;

  return (
    <div className="select-none">
      <div className="relative ml-11 h-60 sm:h-64">
        {/* Grille : filets pleins, discrets, avec leurs valeurs. */}
        {[1, 0.5, 0].map((ratio) => (
          <div
            key={ratio}
            className="absolute inset-x-0 border-t border-line/70"
            style={{ top: `${(y(max * ratio) / H) * 100}%` }}
            aria-hidden
          >
            <span className="absolute -top-2 -left-11 w-9 text-right text-[11px] leading-none text-muted tabular-nums">
              {axisFormat(max * ratio)}
            </span>
          </div>
        ))}

        <div className="absolute inset-0 motion-safe:animate-[chart-reveal_1.1s_cubic-bezier(.2,.7,.2,1)_both]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={WASH} stopOpacity={empty ? 0 : 0.28} />
                <stop offset="100%" stopColor={WASH} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke={empty ? "#e8e0d0" : LINE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-full border border-line/80 bg-white/90 px-4 py-2 text-[13px] text-muted shadow-sm backdrop-blur-sm">
              {emptyMessage}
            </p>
          </div>
        ) : null}

        {active !== null ? (
          <>
            <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-espresso/25" style={{ left: `${activeX}%` }} aria-hidden />
            <div
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_4px_rgb(217_154_43/0.25)]"
              style={{ left: `${activeX}%`, top: `${activeY}%`, background: LINE }}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute top-1 z-10 min-w-[140px] rounded-xl bg-espresso px-3.5 py-2.5 text-white shadow-[0_12px_32px_-12px_rgb(61_43_26/0.6)] ${flip ? "-translate-x-full" : ""}`}
              style={{ left: `calc(${activeX}% ${flip ? "- 14px" : "+ 14px"})` }}
            >
              <p className="text-[17px] leading-tight font-semibold">{format(values[active])}</p>
              <p className="mt-0.5 text-[12px] whitespace-nowrap text-white/65">{bucketLabel(buckets[active])}</p>
            </div>
          </>
        ) : null}

        <div
          tabIndex={0}
          role="group"
          aria-label={`${label} : utilisez les flèches pour parcourir la période`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? values.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="absolute inset-0 cursor-crosshair rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-honey/40"
        />
        <p className="sr-only" aria-live="polite">
          {active !== null ? `${bucketLabel(buckets[active])} : ${format(values[active])}` : ""}
        </p>
      </div>

      <div className="relative mt-2 ml-11 h-4 text-[11px] text-muted" aria-hidden>
        {ticks.map((index) => (
          <span
            key={buckets[index].start}
            className={`absolute whitespace-nowrap ${index === 0 ? "" : index === buckets.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${(x(index) / W) * 100}%` }}
          >
            {tickLabel(buckets[index])}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mini-courbe d'une tuile : la tendance, sans axes ni interaction. */
export function Sparkline({ values, active }: { values: number[]; active: boolean }) {
  const max = Math.max(...values, 1);
  const line = monotonePath(
    values.map((value, index) => [values.length > 1 ? (index / (values.length - 1)) * 100 : 50, 28 - (value / max) * 24]),
  );
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full overflow-visible" aria-hidden>
      <path d={`${line}L100,30L0,30Z`} fill={WASH} fillOpacity={active ? 0.16 : 0.08} />
      <path
        d={line}
        fill="none"
        stroke={active ? LINE : "#b8a58a"}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
