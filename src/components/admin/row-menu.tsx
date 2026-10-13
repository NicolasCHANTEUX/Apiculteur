"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreIcon } from "@/components/icons";

export type MenuItem =
  | { kind: "link"; label: string; href: string; icon?: ReactNode; external?: boolean }
  | { kind: "action"; label: string; icon?: ReactNode; onSelect: () => void; tone?: "danger"; disabled?: boolean }
  | { kind: "separator" };

const itemClass =
  "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] outline-none transition focus-visible:bg-sand hover:bg-sand disabled:cursor-not-allowed disabled:opacity-50";

// Menu d'actions d'une ligne : clavier (flèches, Début, Fin), Échap ou clic
// extérieur pour fermer, focus rendu au bouton.
export function RowMenu({
  label,
  items,
  trigger,
  triggerClassName,
}: {
  label: string;
  items: MenuItem[];
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const focusables = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []);

  useEffect(() => {
    if (!open) return;
    focusables()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const items = focusables();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={trigger ? undefined : label}
        title={trigger ? undefined : label}
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setUpward(window.innerHeight - rect.bottom < 300 && rect.top > 300);
          }
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={
          triggerClassName ??
          "flex size-9 items-center justify-center rounded-lg text-body transition hover:bg-sand hover:text-ink aria-expanded:bg-sand aria-expanded:text-ink"
        }
      >
        {trigger ?? <MoreIcon className="size-5" />}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute right-0 z-50 w-60 rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(61_43_26/0.35)] motion-safe:animate-[menu-in_120ms_ease-out] ${
            upward ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
          }`}
        >
          {items.map((item, index) => {
            if (item.kind === "separator") {
              return <div key={`separator-${index}`} role="separator" className="my-1 h-px bg-line/70" />;
            }
            if (item.kind === "link") {
              return (
                <Link
                  key={item.label}
                  role="menuitem"
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener" : undefined}
                  onClick={() => setOpen(false)}
                  className={`${itemClass} text-ink`}
                >
                  <span className="text-muted">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`${itemClass} ${item.tone === "danger" ? "text-red-700 hover:bg-red-50 focus-visible:bg-red-50" : "text-ink"}`}
              >
                <span className={item.tone === "danger" ? "text-red-500" : "text-muted"}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
