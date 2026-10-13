"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType, type SVGProps } from "react";
import { AreaChart, Sparkline, bucketLabel } from "@/components/admin/dashboard/area-chart";
import { ActivityIcon, CoinsIcon, RotateIcon, ShoppingBagIcon, TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { groupDays, summarizePeriod } from "@/lib/admin/series";

type Metric = "orders" | "revenue" | "actions";
type Span = 7 | 30 | 90;

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 });
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const metrics: Record<
  Metric,
  {
    label: string;
    chartLabel: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    format: (value: number) => string;
    axis: (value: number) => string;
    empty: string;
  }
> = {
  orders: {
    label: "Commandes",
    chartLabel: "Commandes",
    icon: ShoppingBagIcon,
    format: (value) => integer.format(Math.round(value)),
    axis: (value) => compact.format(value),
    empty: "Aucune commande sur la période",
  },
  revenue: {
    label: "Chiffre d’affaires",
    chartLabel: "Chiffre d’affaires",
    icon: CoinsIcon,
    format: (value) => euros.format(value),
    axis: (value) => `${compact.format(value)} €`,
    empty: "Aucune vente sur la période",
  },
  actions: {
    label: "Activité de l’admin",
    chartLabel: "Modifications du catalogue",
    icon: ActivityIcon,
    format: (value) => integer.format(Math.round(value)),
    axis: (value) => compact.format(value),
    empty: "Aucune modification sur la période",
  },
};

/** Nombre qui glisse vers sa nouvelle valeur (sauf si l'utilisateur réduit les animations). */
function AnimatedNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const [frame, setFrame] = useState<number | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / 650);
      const eased = 1 - (1 - progress) ** 3;
      setFrame(progress < 1 ? from + (value - from) * eased : null);
      if (progress < 1) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [value]);

  return <>{format(frame ?? value)}</>;
}

function Delta({ change, span }: { change: number | null; span: Span }) {
  if (change === null) {
    return <span className="text-[12px] text-muted">vs {span} j précédents : —</span>;
  }
  const up = change >= 0;
  const Icon = up ? TrendUpIcon : TrendDownIcon;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold ${
          up ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}
      >
        <Icon className="size-3" strokeWidth={2.5} />
        {up ? "+" : ""}
        {change} %
      </span>
      vs {span} j précédents
    </span>
  );
}

export function Trends({
  days,
  orders,
  revenue,
  actions,
  generatedAt,
}: {
  days: string[];
  orders: number[];
  revenue: number[];
  /** null : journal d'audit indisponible. */
  actions: number[] | null;
  generatedAt: string;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [span, setSpan] = useState<Span>(30);
  const series: Record<Metric, number[] | null> = { orders, revenue, actions };
  const [metric, setMetric] = useState<Metric>(() =>
    orders.slice(-30).some(Boolean) ? "orders" : actions?.slice(-30).some(Boolean) ? "actions" : "orders",
  );
  const values = series[metric] ?? days.map(() => 0);
  const config = metrics[metric];
  const summary = summarizePeriod(values, span);
  // Au-delà d'un mois, des points par semaine : la tendance se lit mieux.
  const bucketSize = span === 90 ? 7 : 1;
  const per = bucketSize === 7 ? "par semaine" : "par jour";
  const buckets = groupDays(days.slice(-span), values.slice(-span), bucketSize);

  return (
    <section aria-labelledby="tendances" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="tendances" className="font-display text-[22px] font-semibold text-ink">Tendances</h2>
          <p className="text-[13px] text-muted">
            Données de {time.format(new Date(generatedAt))}
            <button
              type="button"
              onClick={() => startRefresh(() => router.refresh())}
              className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-honey-dark transition hover:bg-honey/10"
            >
              <RotateIcon className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
          </p>
        </div>
        <div role="group" aria-label="Période" className="inline-flex rounded-xl border border-line/80 bg-white p-1 shadow-[0_1px_2px_rgb(61_43_26/0.05)]">
          {([7, 30, 90] as Span[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={span === value}
              onClick={() => setSpan(value)}
              className={`min-h-9 rounded-lg px-3.5 text-[13px] font-medium transition ${
                span === value ? "bg-espresso text-white shadow-sm" : "text-body hover:bg-sand hover:text-ink"
              }`}
            >
              {value} jours
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 rounded-2xl border border-line/70 bg-white p-5 shadow-[0_1px_2px_rgb(61_43_26/0.04),0_12px_32px_-24px_rgb(61_43_26/0.35)] sm:p-6 xl:order-1">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-muted">{config.chartLabel} {per}</p>
              <p className="mt-1 text-[32px] leading-none font-semibold text-ink">
                <AnimatedNumber value={summary.total} format={config.format} />
                <span className="ml-2 text-[14px] font-normal text-muted">sur {span} jours</span>
              </p>
            </div>
            <Delta change={summary.change} span={span} />
          </div>
          {series[metric] === null ? (
            <p className="flex h-64 items-center justify-center text-[13.5px] text-muted">
              Le journal d’activité est momentanément indisponible.
            </p>
          ) : (
            <AreaChart
              key={`${metric}-${span}`}
              buckets={buckets}
              format={config.format}
              axisFormat={config.axis}
              label={`${config.chartLabel} ${per}`}
              emptyMessage={config.empty}
            />
          )}
          <details className="group mt-5 border-t border-line/60 pt-3">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-[13px] font-medium text-honey-dark">
              Afficher les données
            </summary>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line/60">
              <table className="w-full text-[13px]">
                <caption className="sr-only">{config.chartLabel} {per}, {span} derniers jours</caption>
                <thead className="sticky top-0 bg-cream text-left text-[12px] text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">{bucketSize === 7 ? "Semaine" : "Jour"}</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">{config.label}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {[...buckets].reverse().map((bucket) => (
                    <tr key={bucket.start}>
                      <td className="px-3 py-1.5 text-body">{bucketLabel(bucket)}</td>
                      <td className="px-3 py-1.5 text-right text-ink tabular-nums">{config.format(bucket.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <div className="order-1 grid gap-3 sm:grid-cols-3 xl:order-2 xl:grid-cols-1" role="group" aria-label="Indicateur affiché">
          {(Object.keys(metrics) as Metric[]).map((key) => {
            const item = metrics[key];
            const data = series[key];
            const tile = data ? summarizePeriod(data, span) : null;
            const selected = metric === key;
            const Icon = item.icon;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setMetric(key)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 ${
                  selected
                    ? "border-honey/60 bg-white shadow-[0_14px_36px_-20px_rgb(217_154_43/0.75)] ring-1 ring-honey/30"
                    : "border-line/70 bg-white/70 hover:-translate-y-0.5 hover:border-parchment hover:bg-white hover:shadow-[0_12px_28px_-20px_rgb(61_43_26/0.4)]"
                }`}
              >
                {selected ? (
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-honey via-[#f0c060] to-honey" aria-hidden />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-body">
                    <span
                      className={`flex size-7 items-center justify-center rounded-lg transition ${
                        selected ? "bg-honey text-white" : "bg-sand text-brown group-hover:bg-honey/15 group-hover:text-honey-dark"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    {item.label}
                  </span>
                </div>
                <p className="mt-3 text-[24px] leading-none font-semibold text-ink">
                  {tile ? <AnimatedNumber value={tile.total} format={item.format} /> : "—"}
                </p>
                <div className="mt-1.5 min-h-5">{tile ? <Delta change={tile.change} span={span} /> : <span className="text-[12px] text-muted">Indisponible</span>}</div>
                <div className="mt-2">
                  <Sparkline
                    values={groupDays(days.slice(-span), (data ?? days.map(() => 0)).slice(-span), bucketSize).map((bucket) => bucket.value)}
                    active={selected}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
