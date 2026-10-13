import Link from "next/link";
import { useId, type ReactNode } from "react";
import { statusColors } from "@/components/admin/dashboard/palette";
import { AlertTriangleIcon, CircleCheckIcon } from "@/components/icons";
import type { StockItem } from "@/data/admin/dashboard";
import { niceMax } from "@/lib/admin/series";

/** Carte du tableau de bord, qui apparaît en glissant (sauf animations réduites). */
export function DashCard({
  title,
  subtitle,
  action,
  children,
  delay = 0,
  className = "",
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgb(61_43_26/0.04),0_12px_32px_-24px_rgb(61_43_26/0.35)] motion-safe:animate-[rise_.7s_cubic-bezier(.2,.7,.2,1)_both] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="font-display text-[19px] leading-snug font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** Motif d'alvéoles du bandeau d'accueil, estompé vers les bords. */
export function Honeycomb() {
  const id = useId();
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <defs>
        <pattern id={`${id}-hex`} width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(0.9)">
          <path
            // Un hexagone et l'arête verticale de la rangée décalée suivante.
            d="M28 0 56 16.2v32.3L28 64.7 0 48.5V16.2zM28 64.7V97"
            fill="none"
            stroke="white"
            strokeOpacity="0.07"
            strokeWidth="1.2"
          />
        </pattern>
        <radialGradient id={`${id}-fade`} cx="78%" cy="20%" r="85%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-hex)`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}

/** Jauge circulaire de complétude des fiches (sur fond sombre). */
export function ReadinessRing({ score }: { score: number }) {
  const id = useId();
  return (
    <div className="relative size-[148px] shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f6d27a" />
            <stop offset="100%" stopColor="#d99a2b" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          className="motion-safe:animate-[ring-in_1.4s_cubic-bezier(.2,.7,.2,1)_.2s_both]"
          style={{ strokeDasharray: `${Math.max(score, 0.01)} 100` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[38px] leading-none font-semibold text-white">
          {score}
          <span className="text-[20px] text-white/70"> %</span>
        </span>
        <span className="mt-1 text-[11.5px] text-white/60">fiches complètes</span>
      </div>
    </div>
  );
}

const levelInfo = {
  out: { color: statusColors.critical, label: "Rupture", Icon: AlertTriangleIcon },
  low: { color: statusColors.warning, label: "Faible", Icon: AlertTriangleIcon },
  ok: { color: statusColors.good, label: "OK", Icon: CircleCheckIcon },
} as const;

/** Stock des produits en ligne ou masqués, les plus urgents d'abord, avec leur seuil. */
export function StockHealth({ items }: { items: StockItem[] }) {
  const shown = items.slice(0, 7);
  const scale = niceMax(Math.max(1, ...shown.map((item) => Math.max(item.stock, item.threshold ?? 0))));

  return (
    <div>
      <ul className="space-y-4">
        {shown.map((item, index) => {
          const info = levelInfo[item.level];
          return (
            <li key={item.id} className="group">
              <div className="flex items-center justify-between gap-3 text-[13.5px]">
                <Link href={`/admin/produits/${item.id}`} className="min-w-0 truncate text-ink transition group-hover:text-honey-dark">
                  {item.name}
                </Link>
                <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-body">
                  <info.Icon className="size-3.5" style={{ color: info.color }} />
                  <span className="font-semibold text-ink tabular-nums">{item.stock}</span>
                  <span className="text-muted">· {info.label}</span>
                </span>
              </div>
              <div className="relative mt-2 h-2 rounded-full bg-sand">
                <div
                  className="h-full origin-left rounded-full transition-[filter] group-hover:brightness-110 motion-safe:animate-[grow-x_1s_cubic-bezier(.2,.7,.2,1)_both]"
                  style={{
                    width: `${item.stock > 0 ? Math.max(2, (item.stock / scale) * 100) : 0}%`,
                    background: info.color,
                    animationDelay: `${150 + index * 70}ms`,
                  }}
                />
                {item.threshold !== null ? (
                  <span
                    className="absolute -top-1 h-4 w-0.5 rounded-full bg-espresso/45"
                    style={{ left: `${(item.threshold / scale) * 100}%` }}
                    title={`Seuil d’alerte : ${item.threshold}`}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded-full bg-espresso/45" aria-hidden /> Seuil d’alerte
        </span>
        <span>Échelle : 0 à {scale} unités</span>
        {items.length > shown.length ? <span>{items.length - shown.length} autres produits</span> : null}
      </p>
    </div>
  );
}
