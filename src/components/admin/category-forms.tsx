"use client";

import { useActionState } from "react";
import {
  deleteCategoryAction,
  saveCategoryAction,
  type CategoryFormState,
} from "@/app/admin/categories/actions";
import { adminButton, adminInput, Notice } from "@/components/admin/admin-ui";
import type { AdminCategory } from "@/data/admin/products";

const initial: CategoryFormState = { status: "idle", message: "" };

export function CategoryForm({ category }: { category?: AdminCategory }) {
  const [state, action, pending] = useActionState(saveCategoryAction, initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteCategoryAction, initial);
  const prefix = category?.id ?? "new";
  const feedback = deleteState.status !== "idle" ? deleteState : state;

  return (
    <div className="rounded-xl border border-line/70 bg-white p-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_90px] sm:items-end">
        {category ? <input type="hidden" name="id" value={category.id} /> : null}
        <label className="text-[13px] text-ink" htmlFor={`${prefix}-name`}>
          Nom
          <input id={`${prefix}-name`} name="name" required maxLength={60} defaultValue={category?.name} className={`${adminInput} mt-1.5 h-10`} />
        </label>
        <label className="text-[13px] text-ink" htmlFor={`${prefix}-slug`}>
          Lien (vide = déduit du nom)
          <input id={`${prefix}-slug`} name="slug" maxLength={60} defaultValue={category?.slug} className={`${adminInput} mt-1.5 h-10`} />
        </label>
        <label className="text-[13px] text-ink" htmlFor={`${prefix}-order`}>
          Ordre
          <input id={`${prefix}-order`} name="displayOrder" inputMode="numeric" defaultValue={category?.displayOrder ?? 0} className={`${adminInput} mt-1.5 h-10`} />
        </label>
        <label className="text-[13px] text-ink sm:col-span-3" htmlFor={`${prefix}-description`}>
          Description
          <input id={`${prefix}-description`} name="description" maxLength={500} defaultValue={category?.description ?? ""} className={`${adminInput} mt-1.5 h-10`} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input type="checkbox" name="isActive" defaultChecked={category?.isActive ?? true} className="size-4 accent-honey" />
            Visible sur le site
          </label>
          {category ? (
            <span className="text-[12.5px] text-muted">
              {category.productCount} produit{category.productCount > 1 ? "s" : ""}
            </span>
          ) : null}
          <span className="flex-1" />
          <button type="submit" disabled={pending} className={adminButton.primary}>
            {pending ? "Enregistrement…" : category ? "Enregistrer" : "Créer la catégorie"}
          </button>
        </div>
      </form>
      {category ? (
        <form
          action={deleteAction}
          className="mt-2 flex justify-end"
          onSubmit={(event) => {
            if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={category.id} />
          <button type="submit" disabled={deleting} className="text-[12.5px] text-red-700 hover:underline">
            Supprimer la catégorie
          </button>
        </form>
      ) : null}
      {feedback.status === "error" ? <div className="mt-3"><Notice tone="error">{feedback.message}</Notice></div> : null}
      {feedback.status === "success" ? <div className="mt-3"><Notice tone="success">{feedback.message}</Notice></div> : null}
    </div>
  );
}
