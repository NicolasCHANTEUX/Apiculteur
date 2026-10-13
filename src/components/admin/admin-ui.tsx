import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangleIcon, ChevronRightIcon, CircleCheckIcon, InfoIcon } from "@/components/icons";

// Champs : 16 px sur mobile (pas de zoom automatique d'iOS), 14 px ensuite.
// adminField ne fixe pas de largeur (listes de filtres) ; adminInput occupe
// toute la largeur disponible.
export const adminField =
  "rounded-lg border border-line bg-white px-3 text-[16px] text-ink outline-none transition placeholder:text-muted/70 hover:border-parchment focus:border-honey focus:ring-3 focus:ring-honey/15 disabled:opacity-60 aria-[invalid=true]:border-red-300 aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-red-100 sm:text-[14px]";

export const adminInput = `w-full ${adminField}`;

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey disabled:cursor-not-allowed disabled:opacity-60";

export const adminButton = {
  primary: `${buttonBase} min-h-10 bg-honey px-4 text-[14px] text-white shadow-[0_4px_12px_-6px_rgb(217_154_43/0.8)] hover:bg-honey-dark`,
  secondary: `${buttonBase} min-h-10 border border-line bg-white px-4 text-[14px] text-ink hover:border-parchment hover:bg-cream`,
  ghost: `${buttonBase} min-h-10 px-3 text-[14px] text-body hover:bg-sand hover:text-ink`,
  danger: `${buttonBase} min-h-10 border border-red-200 bg-white px-4 text-[14px] text-red-700 hover:bg-red-50`,
  dangerSolid: `${buttonBase} min-h-10 bg-red-600 px-4 text-[14px] text-white hover:bg-red-700`,
  small: `${buttonBase} min-h-9 border border-line bg-white px-3 text-[13px] text-ink hover:border-parchment hover:bg-cream`,
  icon: `${buttonBase} size-9 shrink-0 rounded-lg text-body hover:bg-sand hover:text-ink`,
} as const;

export type Crumb = { href: string; label: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
  meta?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {breadcrumb?.length ? (
        <nav aria-label="Fil d’Ariane">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            {breadcrumb.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1">
                <Link href={crumb.href} className="rounded hover:text-honey-dark">
                  {crumb.label}
                </Link>
                <ChevronRightIcon className="size-3.5 text-line" />
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-tight font-medium text-ink sm:text-[30px]">
            {title}
          </h1>
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
          {description ? (
            <p className="mt-1.5 max-w-[680px] text-[14px] leading-[1.55] text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export const panelClass =
  "rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgb(61_43_26/0.04),0_8px_24px_-18px_rgb(61_43_26/0.25)]";

export function Panel({
  title,
  description,
  actions,
  children,
  flush = false,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Contenu sans marge intérieure (listes bord à bord). */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`${panelClass} scroll-mt-6`}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div>
            <h2 className="font-display text-[17px] leading-snug font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  );
}

const noticeStyles = {
  success: { box: "border-green-200 bg-green-50 text-green-900", icon: CircleCheckIcon, iconClass: "text-green-600" },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: AlertTriangleIcon, iconClass: "text-red-600" },
  warning: { box: "border-orange-200 bg-orange-50 text-orange-900", icon: AlertTriangleIcon, iconClass: "text-orange-600" },
  info: { box: "border-line bg-white text-body", icon: InfoIcon, iconClass: "text-honey" },
} as const;

export function Notice({
  tone,
  children,
}: {
  tone: keyof typeof noticeStyles;
  children: ReactNode;
}) {
  const style = noticeStyles[tone];
  const Icon = style.icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px] leading-[1.5] ${style.box}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const statusStyles: Record<string, { pill: string; dot: string }> = {
  published: { pill: "bg-green-50 text-green-800 ring-green-200", dot: "bg-green-500" },
  draft: { pill: "bg-sand text-brown ring-line", dot: "bg-parchment" },
  hidden: { pill: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
  sold_out: { pill: "bg-red-50 text-red-800 ring-red-200", dot: "bg-red-500" },
  archived: { pill: "bg-white text-muted ring-line", dot: "bg-line" },
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  const style = statusStyles[status] ?? statusStyles.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset ${style.pill}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "warning" | "honey"; children: ReactNode }) {
  const styles = {
    neutral: "bg-sand text-brown",
    warning: "bg-orange-50 text-orange-800",
    honey: "bg-honey/12 text-honey-dark",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${styles}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-honey/10 text-honey">
          {icon}
        </span>
      ) : null}
      <p className="mt-4 font-display text-[17px] font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1.5 max-w-[420px] text-[13.5px] leading-[1.55] text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
