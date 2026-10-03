import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export const container = "mx-auto w-full max-w-[1058px] px-6";

export const buttonStyles = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-honey px-[22px] text-[15px] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.7)] transition hover:bg-honey-dark",
  ghostOnDark:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-[22px] text-[15px] font-medium text-white backdrop-blur-sm transition hover:bg-white/20",
  link: "inline-flex items-center gap-1.5 text-[13px] font-semibold text-honey transition hover:text-honey-dark",
} as const;

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={site.name}>
      <span className="flex size-8 items-center justify-center rounded-full bg-honey font-display text-[14px] font-semibold text-white">
        A
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[16px] font-semibold ${tone === "light" ? "text-white" : "text-ink"}`}
        >
          {site.shortName}
        </span>
        <span
          className={`mt-0.5 text-[8.5px] font-medium tracking-[0.08em] uppercase ${tone === "light" ? "text-wheat" : "text-muted"}`}
        >
          {site.tagline}
        </span>
      </span>
    </Link>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-semibold tracking-[0.08em] text-honey uppercase">
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  as: Heading = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const centered = align === "center";

  return (
    <div className={centered ? "text-center" : undefined}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading className="mt-3 font-display text-[30px] leading-[1.24] font-medium text-ink sm:text-[34px]">
        {title}
      </Heading>
      {subtitle ? (
        <p
          className={`mt-3 text-[13px] leading-[1.6] text-muted ${centered ? "mx-auto max-w-[540px]" : "max-w-[620px]"}`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// En-tete centre des pages secondaires (avis, FAQ, contact).
export function PageIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="pt-12 pb-10">
      <SectionHeading
        as="h1"
        align="center"
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />
    </div>
  );
}

export function Stars({
  rating,
  className = "text-[13px]",
}: {
  rating: number;
  className?: string;
}) {
  const rounded = Math.round(rating);

  return (
    <span
      className={`inline-flex tracking-[0.05em] ${className}`}
      role="img"
      aria-label={`${rating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} sur 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rounded ? "text-honey" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function InitialAvatar({
  name,
  className = "size-10 text-[17px]",
}: {
  name: string;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white to-honey/15 font-display font-semibold text-honey ring-1 ring-honey/15 ${className}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function OwnerAvatar({
  className = "size-10 text-[15px]",
}: {
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-honey font-display font-semibold text-white ${className}`}
      aria-hidden
    >
      {site.owner.firstName.charAt(0)}
    </span>
  );
}
