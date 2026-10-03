import {
  deleteProductImageAction,
  moveProductImageAction,
  rotateProductImageAction,
  updateImageAltAction,
} from "@/app/admin/produits/actions";
import { adminButton, adminInput, Panel } from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/admin/confirm-button";
import { ImageUploadForm } from "@/components/admin/image-upload-form";
import type { AdminProductImage } from "@/data/admin/products";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images/product-image";

export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: AdminProductImage[];
}) {
  return (
    <Panel
      title="Photos"
      description="La première photo sert de couverture sur les cartes et en tête de fiche."
    >
      <div className="space-y-5">
        {images.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="overflow-hidden rounded-lg border border-line/70">
                <div className="relative aspect-[4/3] bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.altText ?? ""} className="size-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute top-2 left-2 rounded-full bg-honey px-2 py-0.5 text-[11px] font-semibold text-white">
                      Couverture
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <form action={updateImageAltAction} className="flex gap-2">
                    <input type="hidden" name="imageId" value={image.id} />
                    <label className="sr-only" htmlFor={`alt-${image.id}`}>
                      Description de la photo {index + 1}
                    </label>
                    <input
                      id={`alt-${image.id}`}
                      name="altText"
                      defaultValue={image.altText ?? ""}
                      maxLength={200}
                      placeholder="Description (accessibilité)"
                      className={`${adminInput} h-9`}
                    />
                    <SubmitButton className={adminButton.small} title="Enregistrer la description">
                      OK
                    </SubmitButton>
                  </form>
                  <div className="flex flex-wrap gap-1.5">
                    {index > 0 ? (
                      <form action={moveProductImageAction}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="direction" value="cover" />
                        <SubmitButton className={adminButton.small}>Couverture</SubmitButton>
                      </form>
                    ) : null}
                    {index > 0 ? (
                      <form action={moveProductImageAction}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="direction" value="up" />
                        <SubmitButton className={adminButton.small} title="Avancer">
                          ←
                        </SubmitButton>
                      </form>
                    ) : null}
                    {index < images.length - 1 ? (
                      <form action={moveProductImageAction}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="direction" value="down" />
                        <SubmitButton className={adminButton.small} title="Reculer">
                          →
                        </SubmitButton>
                      </form>
                    ) : null}
                    {image.storagePath ? (
                      <form action={rotateProductImageAction}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <SubmitButton className={adminButton.small} title="Tourner de 90°" pendingLabel="Rotation…">
                          ↻ 90°
                        </SubmitButton>
                      </form>
                    ) : null}
                    <form action={deleteProductImageAction}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <SubmitButton
                        className={`${adminButton.small} text-red-700`}
                        confirm="Supprimer définitivement cette photo ?"
                      >
                        Supprimer
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted">Aucune photo pour le moment.</p>
        )}
        <ImageUploadForm productId={productId} remaining={MAX_IMAGES_PER_PRODUCT - images.length} />
      </div>
    </Panel>
  );
}
