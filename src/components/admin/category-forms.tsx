"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
  setCategoryActiveAction,
} from "@/app/admin/categories/actions";
import { ActionButton, Spinner } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { useToast } from "@/components/admin/toast";
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { AdminCategory } from "@/data/admin/products";
import { idleResult, type ActionResult } from "@/lib/admin/action-result";

/** Enregistre une catégorie et notifie le résultat ; `onSaved` après succès. */
function useSaveCategory(onSaved: () => void) {
  const toast = useToast();
  return useActionState(async (previous: ActionResult, formData: FormData) => {
    const result = await saveCategoryAction(previous, formData);
    if (result.status === "success") {
      toast.show("success", result.message);
      startTransition(onSaved);
    }
    return result;
  }, idleResult);
}

function CategoryFields({ category, prefix }: { category?: AdminCategory; prefix: string }) {
  return (
    <>
      <label className="block text-[13.5px] font-medium text-ink" htmlFor={`${prefix}-name`}>
        Nom
        <input
          id={`${prefix}-name`}
          name="name"
          required
          maxLength={60}
          defaultValue={category?.name}
          placeholder="Essaims"
          className={`${adminInput} mt-1.5 h-10 font-normal`}
        />
      </label>
      {category ? (
        <label className="block text-[13.5px] font-medium text-ink" htmlFor={`${prefix}-slug`}>
          Lien
          <input
            id={`${prefix}-slug`}
            name="slug"
            maxLength={60}
            defaultValue={category.slug}
            className={`${adminInput} mt-1.5 h-10 font-normal`}
          />
        </label>
      ) : null}
      <label className="block text-[13.5px] font-medium text-ink sm:col-span-2" htmlFor={`${prefix}-description`}>
        Description <span className="font-normal text-muted">(facultative)</span>
        <input
          id={`${prefix}-description`}
          name="description"
          maxLength={500}
          defaultValue={category?.description ?? ""}
          placeholder="Colonies prêtes à être installées au rucher"
          className={`${adminInput} mt-1.5 h-10 font-normal`}
        />
      </label>
    </>
  );
}

export function NewCategoryForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useSaveCategory(() => setFormKey((key) => key + 1));

  return (
    <form action={action} className="space-y-4">
      <div key={formKey} className="flex flex-col gap-4">
        <CategoryFields prefix="new" />
        <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
          <input type="checkbox" name="isActive" defaultChecked className="size-4 accent-honey" />
          Visible sur le site
        </label>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="text-[13px] font-medium text-red-700">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={adminButton.primary}>
        {pending ? <Spinner /> : <PlusIcon className="size-4" />}
        Ajouter la catégorie
      </button>
    </form>
  );
}

export function CategoryRow({
  category,
  first,
  last,
}: {
  category: AdminCategory;
  first: boolean;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useSaveCategory(() => setEditing(false));

  if (editing) {
    return (
      <li className="bg-cream/40 px-4 py-4 sm:px-5">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={category.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryFields category={category} prefix={category.id} />
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <input type="checkbox" name="isActive" defaultChecked={category.isActive} className="size-4 accent-honey" />
              Visible sur le site
            </label>
          </div>
          {state.status === "error" ? (
            <p role="alert" className="text-[13px] font-medium text-red-700">
              {state.message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={adminButton.primary}>
              {pending ? <Spinner /> : null}
              Enregistrer
            </button>
            <button type="button" onClick={() => setEditing(false)} className={adminButton.ghost}>
              Annuler
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition has-[[aria-busy=true]]:opacity-60 sm:flex-nowrap sm:px-5">
      <div className="flex shrink-0 flex-col">
        <ActionButton
          action={moveCategoryAction}
          fields={{ id: category.id, direction: "up" }}
          className={`${adminButton.icon} h-6 w-8 ${first ? "invisible" : ""}`}
          label={`Monter « ${category.name} »`}
        >
          <ChevronUpIcon className="size-4" />
        </ActionButton>
        <ActionButton
          action={moveCategoryAction}
          fields={{ id: category.id, direction: "down" }}
          className={`${adminButton.icon} h-6 w-8 ${last ? "invisible" : ""}`}
          label={`Descendre « ${category.name} »`}
        >
          <ChevronDownIcon className="size-4" />
        </ActionButton>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${category.isActive ? "text-ink" : "text-muted"}`}>{category.name}</span>
          {!category.isActive ? (
            <span className="rounded-md bg-sand px-1.5 py-0.5 text-[11.5px] font-medium text-brown">Masquée</span>
          ) : null}
        </p>
        {category.description ? (
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{category.description}</p>
        ) : null}
      </div>

      <Link
        href={`/admin/produits?categorie=${category.id}`}
        className="shrink-0 rounded-md px-2 py-1 text-[13px] text-body tabular-nums transition hover:bg-sand hover:text-ink"
      >
        {category.productCount} produit{category.productCount > 1 ? "s" : ""}
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
        <ActionButton
          action={setCategoryActiveAction}
          fields={{ id: category.id, isActive: String(!category.isActive) }}
          className={adminButton.icon}
          label={category.isActive ? `Masquer « ${category.name} » du site` : `Afficher « ${category.name} » sur le site`}
        >
          {category.isActive ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
        </ActionButton>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={adminButton.icon}
          aria-label={`Modifier « ${category.name} »`}
          title="Modifier"
        >
          <PencilIcon className="size-4" />
        </button>
        {category.productCount === 0 ? (
          <ActionButton
            action={deleteCategoryAction}
            fields={{ id: category.id }}
            className={`${adminButton.icon} hover:bg-red-50 hover:text-red-700`}
            label={`Supprimer « ${category.name} »`}
            confirm={{
              title: `Supprimer « ${category.name} » ?`,
              description: "Elle ne contient aucun produit. Cette action est irréversible.",
              confirmLabel: "Supprimer",
              tone: "danger",
            }}
          >
            <TrashIcon className="size-4" />
          </ActionButton>
        ) : (
          <span
            className={`${adminButton.icon} cursor-not-allowed opacity-35`}
            title="Contient des produits : déplacez-les ou masquez la catégorie"
            aria-hidden
          >
            <TrashIcon className="size-4" />
          </span>
        )}
      </div>
    </li>
  );
}
