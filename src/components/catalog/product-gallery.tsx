"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ImageBadges } from "@/components/catalog/product-card";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, MinusIcon, PlusIcon, RotateIcon, SearchIcon } from "@/components/icons";
import type { PublicProductImage } from "@/data/catalog";

const MAX_SCALE = 4;
const STEP_SCALE = 2.5;

type View = { scale: number; x: number; y: number };
const initialView: View = { scale: 1, x: 0, y: 0 };

/** Déplacement borné : la photo agrandie ne laisse jamais de vide sur les bords. */
function clamp(view: View, width: number, height: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(1, view.scale));
  const maxX = ((scale - 1) * width) / 2;
  const maxY = ((scale - 1) * height) / 2;
  return { scale, x: Math.min(maxX, Math.max(-maxX, view.x)), y: Math.min(maxY, Math.max(-maxY, view.y)) };
}

/** Agrandissement autour d'un point (relatif au centre), qui reste sous le doigt ou le pointeur. */
function zoomAt(view: View, scale: number, point: { x: number; y: number }): View {
  const ratio = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio };
}

// Galerie de la fiche produit (CAHIER §5.2) : photo principale, miniatures,
// flèches et clavier ; plein écran (dialogue natif, Échap pour fermer) avec
// zoom au pincement, au double-clic (ou double tap), à la molette et aux
// boutons, déplacement de la photo agrandie et réinitialisation.
export function ProductGallery({ images, name, badges }: { images: PublicProductImage[]; name: string; badges: string[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>(initialView);
  // Geste en cours : pas de transition, la photo suit le doigt.
  const [moving, setMoving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Gestes en cours : pointeurs actifs, départ du pincement ou du déplacement, dernier tap.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; distance: number; mid: { x: number; y: number }; start: { x: number; y: number } } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const count = images.length;
  const image = images[index];
  const zoomed = view.scale > 1.01;

  const reset = () => setView(initialView);
  const go = (step: number) => {
    reset();
    setIndex((current) => (current + step + count) % count);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /** Point de l'écran relatif au centre de la zone de la photo. */
  function local(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }

  function apply(next: View) {
    const rect = stageRef.current?.getBoundingClientRect();
    setView(rect ? clamp(next, rect.width, rect.height) : next);
  }

  function toggleAt(clientX: number, clientY: number) {
    if (zoomed) reset();
    else apply(zoomAt(view, STEP_SCALE, local(clientX, clientY)));
  }

  function zoomBy(factor: number) {
    apply(zoomAt(view, Math.min(MAX_SCALE, Math.max(1, view.scale * factor)), { x: 0, y: 0 }));
  }

  function beginGesture() {
    const points = [...pointers.current.values()];
    if (points.length === 0) {
      gesture.current = null;
      return;
    }
    const [a, b] = points;
    gesture.current = {
      view,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      mid: b ? local((a.x + b.x) / 2, (a.y + b.y) / 2) : local(a.x, a.y),
      start: { x: a.x, y: a.y },
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setMoving(true);
    beginGesture();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    if (!start) return;
    const [a, b] = [...pointers.current.values()];
    if (b && start.distance > 0) {
      // Pincement : l'échelle suit l'écart des doigts, le milieu reste en place.
      const scale = Math.min(MAX_SCALE, Math.max(1, start.view.scale * (Math.hypot(a.x - b.x, a.y - b.y) / start.distance)));
      const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      const pinched = zoomAt(start.view, scale, start.mid);
      apply({ scale, x: pinched.x + (mid.x - start.mid.x), y: pinched.y + (mid.y - start.mid.y) });
    } else if (start.view.scale > 1.01) {
      // Un doigt ou la souris : déplacement de la photo agrandie.
      apply({ ...start.view, x: start.view.x + a.x - start.start.x, y: start.view.y + a.y - start.start.y });
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    pointers.current.delete(event.pointerId);
    // Double tap au doigt (la souris utilise le double-clic).
    if (event.pointerType === "touch" && start && pointers.current.size === 0 && Math.hypot(event.clientX - start.start.x, event.clientY - start.start.y) < 10) {
      const now = Date.now();
      const previous = lastTap.current;
      if (previous && now - previous.time < 320 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30) {
        lastTap.current = null;
        toggleAt(event.clientX, event.clientY);
      } else {
        lastTap.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }
    if (pointers.current.size === 0) setMoving(false);
    beginGesture();
  }

  if (!image) {
    return (
      <div className="relative aspect-[4/3] rounded-2xl bg-sand shadow-[0_24px_48px_-20px_rgb(61_43_26/0.45)]">
        <ImageBadges badges={badges} size="large" />
      </div>
    );
  }

  const control = "flex size-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-35";

  return (
    <div
      className="space-y-3"
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
      }}
    >
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand shadow-[0_24px_48px_-20px_rgb(61_43_26/0.45)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block size-full cursor-zoom-in"
          aria-label={`Agrandir la photo ${index + 1} sur ${count}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={image.url}
            src={image.url}
            alt={image.altText ?? name}
            className="size-full object-cover transition duration-700 group-hover:scale-[1.03] motion-safe:animate-[fade-in_.4s_ease-out]"
          />
        </button>
        <ImageBadges badges={badges} size="large" />
        <span className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full bg-espresso/60 px-3 py-1.5 text-[12px] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <SearchIcon className="size-3.5" />
          Agrandir
        </span>
        {count > 1 ? (
          <>
            {[-1, 1].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => go(step)}
                aria-label={step < 0 ? "Photo précédente" : "Photo suivante"}
                className={`absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${
                  step < 0 ? "left-3" : "right-3"
                }`}
              >
                {step < 0 ? <ChevronLeftIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
              </button>
            ))}
            <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-espresso/60 px-2.5 py-1 text-[11.5px] font-medium text-white tabular-nums backdrop-blur-sm">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="grid grid-cols-5 gap-2.5 sm:grid-cols-6" aria-label="Photos du produit">
          {images.map((item, position) => (
            <li key={item.url}>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIndex(position);
                }}
                aria-label={`Afficher la photo ${position + 1}`}
                aria-current={position === index ? "true" : undefined}
                className={`block aspect-square w-full overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-cream transition ${
                  position === index ? "ring-honey" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label={`Photos de ${name}`}
        onCancel={(event) => {
          event.preventDefault();
          reset();
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") zoomBy(1.5);
          if (event.key === "-") zoomBy(1 / 1.5);
          if (event.key === "0") reset();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-espresso/90 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col text-white">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 truncate text-[14px] text-white/80">
              {name}
              {count > 1 ? <span className="ml-2 text-white/50 tabular-nums">{index + 1} / {count}</span> : null}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => zoomBy(1 / 1.5)} disabled={!zoomed} className={control} aria-label="Dézoomer">
                <MinusIcon className="size-5" />
              </button>
              <button type="button" onClick={() => zoomBy(1.5)} disabled={view.scale >= MAX_SCALE} className={control} aria-label="Zoomer">
                <PlusIcon className="size-5" />
              </button>
              {zoomed ? (
                <button type="button" onClick={reset} className={control} aria-label="Réinitialiser le zoom" title="Réinitialiser le zoom">
                  <RotateIcon className="size-5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                className={`${control} ml-1.5`}
                aria-label="Fermer"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
            <div
              ref={stageRef}
              className={`relative max-h-full touch-none overflow-hidden rounded-xl select-none ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
              onDoubleClick={(event) => toggleAt(event.clientX, event.clientY)}
              onWheel={(event) => apply(zoomAt(view, Math.min(MAX_SCALE, Math.max(1, view.scale * Math.exp(-event.deltaY * 0.0015))), local(event.clientX, event.clientY)))}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText ?? name}
                className={`max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain ${moving ? "" : "transition-transform duration-200 ease-out"}`}
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
                draggable={false}
              />
            </div>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 sm:left-4"
                  aria-label="Photo précédente"
                >
                  <ChevronLeftIcon className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 sm:right-4"
                  aria-label="Photo suivante"
                >
                  <ChevronRightIcon className="size-6" />
                </button>
              </>
            ) : null}
          </div>
          <p className="px-4 pb-4 text-center text-[12px] text-white/50">
            {zoomed ? "Faites glisser pour vous déplacer · double-clic pour revenir à la vue d’ensemble" : "Double-clic, pincement ou molette pour zoomer"}
            {count > 1 ? " · flèches du clavier pour naviguer" : ""}
          </p>
        </div>
      </dialog>
    </div>
  );
}
