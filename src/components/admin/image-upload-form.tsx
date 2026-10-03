"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadProductImagesAction, type ActionResult } from "@/app/admin/produits/actions";
import { adminButton, adminInput, Notice } from "@/components/admin/admin-ui";

export function ImageUploadForm({ productId, remaining }: { productId: string; remaining: number }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    uploadProductImagesAction,
    { status: "idle", message: "" },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  if (remaining <= 0) {
    return <Notice tone="info">6 photos au maximum : retirez-en une pour en ajouter.</Notice>;
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <label htmlFor="photos" className="block text-[13px] text-ink">
        Ajouter des photos ({remaining} possible{remaining > 1 ? "s" : ""})
      </label>
      <input
        id="photos"
        name="photos"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className={`${adminInput} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-3 file:py-1.5 file:text-[13px] file:text-ink`}
      />
      <p className="text-[12px] text-muted">
        JPG, PNG ou WebP, 8 Mo au maximum par photo. Elles sont redressées, réduites
        et converties automatiquement ; les données de localisation sont retirées.
      </p>
      <button type="submit" disabled={pending} className={adminButton.primary}>
        {pending ? "Envoi en cours…" : "Envoyer"}
      </button>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}
    </form>
  );
}
