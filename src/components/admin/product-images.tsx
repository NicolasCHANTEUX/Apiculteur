"use client";

import { useState } from "react";
import {
  deleteProductImageAction,
  moveProductImageAction,
  rotateProductImageAction,
  updateImageAltAction,
} from "@/app/admin/produits/actions";
import { ActionButton, Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput, Panel } from "@/components/admin/admin-ui";
import { ImageUploadForm } from "@/components/admin/image-upload-form";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateIcon,
  StarIcon,
  TrashIcon,
} from "@/components/icons";
import type { AdminProductImage } from "@/data/admin/products";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images/limits";

const toolClass = `${adminButton.icon} size-8`;

function AltText({ image, position }: { image: AdminProductImage; position: number }) {
  const saved = image.altText ?? "";
  const [value, setValue] = useState(saved);
  const { run, pending } = useAdminAction();
  const changed = value.trim() !== saved;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) run(updateImageAltAction, { imageId: image.id, altText: value });
      }}
      className="flex items-center gap-1.5"
    >
      <label className="sr-only" htmlFor={`alt-${image.id}`}>
        Description de la photo {position}
      </label>
      <input
        id={`alt-${image.id}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={200}
        placeholder="Décrivez la photo (accessibilité)"
        className={`${adminInput} h-9`}
      />
      {changed ? (
        <button type="submit" disabled={pending} className={`${adminButton.small} shrink-0`}>
          {pending ? <Spinner className="size-3.5" /> : null}
          Enregistrer
        </button>
      ) : null}
    </form>
  );
}

export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: AdminProductImage[];
}) {
  return (
    <Panel
      id="photos"
      title="Photos"
      description="La première photo sert de couverture sur les cartes et en tête de fiche."
      actions={
        <span className="rounded-full bg-sand px-2.5 py-0.5 text-[12px] font-medium text-brown tabular-nums">
          {images.length}/{MAX_IMAGES_PER_PRODUCT}
        </span>
      }
    >
      <div className="space-y-5">
        {images.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => (
              <li
                key={image.id}
                className="overflow-hidden rounded-xl border border-line/70 bg-white transition has-[[aria-busy=true]]:opacity-60"
              >
                <div className="relative aspect-[4/3] bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.altText ?? ""} className="size-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-honey px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                      Couverture
                    </span>
                  ) : null}
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-espresso/70 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums backdrop-blur-sm">
                    {index + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 border-b border-line/60 px-1.5 py-1">
                  <div className="flex items-center">
                    {index > 0 ? (
                      <ActionButton action={moveProductImageAction} fields={{ imageId: image.id, direction: "cover" }} className={toolClass} label="Mettre en couverture">
                        <StarIcon className="size-4" />
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      action={moveProductImageAction}
                      fields={{ imageId: image.id, direction: "up" }}
                      className={`${toolClass} ${index === 0 ? "invisible" : ""}`}
                      label="Déplacer vers la gauche"
                    >
                      <ChevronLeftIcon className="size-4" />
                    </ActionButton>
                    <ActionButton
                      action={moveProductImageAction}
                      fields={{ imageId: image.id, direction: "down" }}
                      className={`${toolClass} ${index === images.length - 1 ? "invisible" : ""}`}
                      label="Déplacer vers la droite"
                    >
                      <ChevronRightIcon className="size-4" />
                    </ActionButton>
                    {image.storagePath ? (
                      <ActionButton action={rotateProductImageAction} fields={{ imageId: image.id }} className={toolClass} label="Tourner de 90°">
                        <RotateIcon className="size-4" />
                      </ActionButton>
                    ) : null}
                  </div>
                  <ActionButton
                    action={deleteProductImageAction}
                    fields={{ imageId: image.id }}
                    className={`${toolClass} hover:bg-red-50 hover:text-red-700`}
                    label="Supprimer la photo"
                    confirm={{
                      title: "Supprimer cette photo ?",
                      description: index === 0 && images.length > 1 ? "La photo suivante deviendra la couverture." : "Elle sera retirée de la fiche et du stockage.",
                      confirmLabel: "Supprimer",
                      tone: "danger",
                    }}
                  >
                    <TrashIcon className="size-4" />
                  </ActionButton>
                </div>
                <div className="p-2.5">
                  <AltText key={image.altText ?? ""} image={image} position={index + 1} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <ImageUploadForm productId={productId} remaining={MAX_IMAGES_PER_PRODUCT - images.length} />
      </div>
    </Panel>
  );
}
