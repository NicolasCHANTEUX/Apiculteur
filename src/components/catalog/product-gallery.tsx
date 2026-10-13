"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from "@/components/icons";
import type { PublicProductImage } from "@/data/catalog";

// Galerie de la fiche produit : photo principale, miniatures, flèches et
// clavier ; plein écran (dialogue natif, Échap pour fermer) avec zoom au clic.
export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: PublicProductImage[];
  name: string;
  badge: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = images.length;
  const image = images[index];
  const go = (step: number) => {
    setZoom(null);
    setIndex((current) => (current + step + count) % count);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function toggleZoom(event: MouseEvent<HTMLElement>) {
    if (zoom) {
      setZoom(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  }

  function followPointer(event: MouseEvent<HTMLElement>) {
    if (!zoom) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  }

  if (!image) {
    return <div className="aspect-[4/3] rounded-2xl bg-sand shadow-[0_24px_48px_-20px_rgb(61_43_26/0.45)]" aria-hidden />;
  }

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
        {badge ? (
          <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-honey px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
            {badge}
          </span>
        ) : null}
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
                  setZoom(null);
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
          setZoom(null);
          setOpen(false);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-espresso/90 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col text-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="min-w-0 truncate text-[14px] text-white/80">
              {name}
              {count > 1 ? <span className="ml-2 text-white/50 tabular-nums">{index + 1} / {count}</span> : null}
            </p>
            <button
              type="button"
              onClick={() => {
                setZoom(null);
                setOpen(false);
              }}
              className="flex size-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label="Fermer"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
            <div
              className={`relative max-h-full overflow-hidden rounded-xl ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              onClick={toggleZoom}
              onPointerMove={followPointer}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText ?? name}
                className="max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain transition-transform duration-300 ease-out select-none"
                style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
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
          <p className="pb-4 text-center text-[12px] text-white/50">
            {zoom ? "Cliquez pour revenir à la vue d’ensemble" : "Cliquez sur la photo pour zoomer"}
            {count > 1 ? " · flèches du clavier pour naviguer" : ""}
          </p>
        </div>
      </dialog>
    </div>
  );
}
