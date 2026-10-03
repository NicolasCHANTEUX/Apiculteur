import type { ReactNode } from "react";

export const adminInput =
  "w-full rounded-lg border border-line bg-white px-3 text-[16px] text-ink outline-none transition placeholder:text-muted/70 focus:border-honey focus:ring-2 focus:ring-honey/15 disabled:opacity-60 sm:text-[14px]";

export const adminButton = {
  primary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-honey px-4 text-[14px] font-medium text-white transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70",
  secondary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[14px] text-ink transition hover:bg-sand disabled:opacity-60",
  danger:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-[14px] text-red-700 transition hover:bg-red-50",
  small:
    "inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink transition hover:bg-sand disabled:opacity-50",
} as const;

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">{title}</h1>
        {description ? <p className="mt-1 text-[14px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line/70 bg-white shadow-[0_1px_3px_rgb(61_43_26/0.06)]">
      {title ? (
        <div className="border-b border-line/60 px-5 py-3.5">
          <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[12.5px] text-muted">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-line bg-sand text-body",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-[13.5px] leading-[1.5] ${styles}`}
    >
      {children}
    </p>
  );
}

const statusStyles: Record<string, string> = {
  published: "border-green-200 bg-green-50 text-green-700",
  draft: "border-line bg-sand text-muted",
  hidden: "border-orange-200 bg-orange-50 text-orange-700",
  sold_out: "border-line bg-sand text-brown",
  archived: "border-line bg-white text-muted",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${statusStyles[status] ?? statusStyles.draft}`}
    >
      {label}
    </span>
  );
}
