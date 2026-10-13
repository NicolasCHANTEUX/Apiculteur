"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { uploadProductImagesAction } from "@/app/admin/produits/actions";
import { Spinner } from "@/components/admin/action-button";
import { adminButton } from "@/components/admin/admin-ui";
import { useToast } from "@/components/admin/toast";
import { CloseIcon, UploadIcon } from "@/components/icons";
import { idleResult, type ActionResult } from "@/lib/admin/action-result";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/images/limits";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

// Zone de dépôt : glisser-déposer ou sélection, aperçu et contrôle (format,
// taille, nombre) avant l'envoi. Le serveur refait tous les contrôles.
export function ImageUploadForm({ productId, remaining }: { productId: string; remaining: number }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [, submit, pending] = useActionState(async (previous: ActionResult, formData: FormData) => {
    const result = await uploadProductImagesAction(previous, formData);
    if (result.status === "success") {
      startTransition(() => setFiles([]));
      toast.show("success", result.message);
    } else if (result.status === "error") {
      toast.show("error", result.message);
    }
    return result;
  }, idleResult);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function add(list: FileList | null) {
    if (!list?.length) return;
    const rejected: string[] = [];
    const accepted = Array.from(list).filter((file) => {
      if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        rejected.push(`« ${file.name} » n’est pas une photo JPG, PNG ou WebP.`);
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push(`« ${file.name} » dépasse 8 Mo.`);
        return false;
      }
      return true;
    });
    const next = [...files, ...accepted];
    if (next.length > remaining) {
      rejected.push(`Vous pouvez encore ajouter ${remaining} photo${remaining > 1 ? "s" : ""}.`);
    }
    setFiles(next.slice(0, remaining));
    setProblem(rejected.length ? rejected.join(" ") : null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (remaining <= 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-cream/50 px-4 py-3 text-[13px] text-muted">
        6 photos au maximum : supprimez-en une pour en ajouter une autre.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={`photos-${productId}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
          dragging ? "border-honey bg-honey/8" : "border-line bg-cream/40 hover:border-parchment hover:bg-cream"
        }`}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-honey shadow-sm ring-1 ring-line/70">
          <UploadIcon className="size-[18px]" />
        </span>
        <span className="text-[14px] font-medium text-ink">
          Glissez vos photos ici ou <span className="text-honey-dark underline underline-offset-2">parcourez</span>
        </span>
        <span className="text-[12.5px] text-muted">
          JPG, PNG ou WebP · 8 Mo par photo ·{" "}
          {remaining - files.length > 0
            ? `encore ${remaining - files.length} possible${remaining - files.length > 1 ? "s" : ""}`
            : "maximum atteint"}
        </span>
        <input
          ref={inputRef}
          id={`photos-${productId}`}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={(event) => add(event.target.files)}
          className="sr-only"
        />
      </label>

      {problem ? (
        <p role="alert" className="text-[12.5px] font-medium text-red-700">
          {problem}
        </p>
      ) : null}

      {files.length ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("productId", productId);
            for (const file of files) formData.append("photos", file);
            startTransition(() => submit(formData));
          }}
          className="space-y-3 rounded-xl border border-line/70 bg-white p-3"
        >
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[index]}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover ring-1 ring-line/60"
                />
                <span className="mt-1 block truncate text-[11px] text-muted" title={file.name}>
                  {formatSize(file.size)}
                </span>
                {!pending ? (
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
                    className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink shadow ring-1 ring-line transition hover:bg-white"
                    aria-label={`Retirer ${file.name}`}
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-muted">
              Redressées, réduites et converties automatiquement ; la position GPS est retirée.
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => setFiles([])} className={adminButton.ghost}>
                Annuler
              </button>
              <button type="submit" disabled={pending} className={adminButton.primary}>
                {pending ? <Spinner /> : <UploadIcon className="size-4" />}
                {pending
                  ? "Envoi en cours…"
                  : `Envoyer ${files.length} photo${files.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
