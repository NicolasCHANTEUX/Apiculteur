"use client";

import { useState } from "react";
import { categoryColors, otherColor } from "@/components/admin/dashboard/palette";

const R = 60;
const STROKE = 20;
// Écart de 2 px entre les parts, en unités de pathLength (100 = tour complet).
const GAP = (2 / (2 * Math.PI * R)) * 100;

export type DonutSlice = { key: string; name: string; count: number };

export function DonutChart({ slices, unit }: { slices: DonutSlice[]; unit: [string, string] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const color = (slice: DonutSlice, index: number) => (slice.key === "other" ? otherColor : categoryColors[index]);
  const label = (count: number) => `${count} ${count > 1 ? unit[1] : unit[0]}`;
  const current = slices.find((slice) => slice.key === active);

  const shares = slices.map((slice) => (total ? (slice.count / total) * 100 : 0));
  const arcs = slices.map((slice, index) => ({
    slice,
    index,
    start: shares.slice(0, index).reduce((sum, share) => sum + share, 0),
    length: shares[index],
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative size-[180px] shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden>
          <circle cx="80" cy="80" r={R} fill="none" stroke="#f0ebe0" strokeWidth={STROKE} />
          {arcs.map(({ slice, index, start, length }) => (
            <circle
              key={slice.key}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              pathLength={100}
              stroke={color(slice, index)}
              strokeWidth={active === slice.key ? STROKE + 6 : STROKE}
              strokeDashoffset={-start}
              onPointerEnter={() => setActive(slice.key)}
              onPointerLeave={() => setActive(null)}
              className="cursor-pointer transition-[stroke-width,opacity] duration-200 motion-safe:animate-[donut-in_1s_cubic-bezier(.2,.7,.2,1)_both]"
              style={{
                strokeDasharray: `${Math.max(0, length - (slices.length > 1 ? GAP : 0))} ${100 - Math.max(0, length - (slices.length > 1 ? GAP : 0))}`,
                opacity: active && active !== slice.key ? 0.35 : 1,
                animationDelay: `${index * 90}ms`,
              }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[34px] leading-none font-semibold text-ink">{current ? current.count : total}</span>
          <span className="mt-1 max-w-[110px] truncate text-[12px] text-muted">
            {current ? current.name : total > 1 ? unit[1] : unit[0]}
          </span>
          {current && total ? (
            <span className="mt-0.5 text-[11.5px] font-medium text-body">{Math.round((current.count / total) * 100)} %</span>
          ) : null}
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {slices.map((slice, index) => (
          <li key={slice.key}>
            <button
              type="button"
              onPointerEnter={() => setActive(slice.key)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(slice.key)}
              onBlur={() => setActive(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] outline-none transition focus-visible:ring-2 focus-visible:ring-honey/40 ${
                active === slice.key ? "bg-sand" : "hover:bg-cream"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: color(slice, index) }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-ink">{slice.name}</span>
              <span className="font-medium text-ink tabular-nums">{slice.count}</span>
              <span className="w-10 text-right text-[12px] text-muted tabular-nums">
                {total ? Math.round((slice.count / total) * 100) : 0} %
              </span>
            </button>
          </li>
        ))}
        <li className="sr-only">Total : {label(total)}</li>
      </ul>
    </div>
  );
}
