"use client";

import { useState } from "react";
import {
  deleteProductAction,
  duplicateProductAction,
  setProductStatusAction,
} from "@/app/admin/produits/actions";
import { useAdminAction, Spinner } from "@/components/admin/action-button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/admin/confirm-dialog";
import { RowMenu, type MenuItem } from "@/components/admin/row-menu";
import {
  ArchiveIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  RotateIcon,
  TrashIcon,
} from "@/components/icons";
import type { ProductStatus } from "@/data/admin/products";

type Pending = { options: ConfirmOptions; run: () => void };

// Actions d'un produit (liste ou fiche) : publier, masquer, dupliquer,
// archiver, restaurer, supprimer. Les actions sensibles passent par une
// confirmation.
export function ProductActions({
  product,
  context,
}: {
  product: { id: string; name: string; slug: string; status: ProductStatus };
  context: "list" | "edit";
}) {
  const { run, pending } = useAdminAction();
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const { id, name, slug, status } = product;

  const setStatus = (next: ProductStatus) => run(setProductStatusAction, { id, status: next });

  const items: MenuItem[] = [];
  if (context === "list") {
    items.push({ kind: "link", label: "Modifier la fiche", href: `/admin/produits/${id}`, icon: <PencilIcon /> });
  }
  if (status === "published") {
    items.push({ kind: "link", label: "Voir sur le site", href: `/produits/${slug}`, icon: <ExternalLinkIcon />, external: true });
  }
  if (items.length) items.push({ kind: "separator" });

  if (status !== "published" && status !== "archived") {
    items.push({ kind: "action", label: "Publier sur le site", icon: <EyeIcon />, onSelect: () => setStatus("published") });
  }
  if (status === "published" || status === "sold_out") {
    items.push({ kind: "action", label: "Masquer du site", icon: <EyeOffIcon />, onSelect: () => setStatus("hidden") });
  }
  items.push({
    kind: "action",
    label: "Dupliquer",
    icon: <CopyIcon />,
    onSelect: () => run(duplicateProductAction, { id }),
  });
  items.push({ kind: "separator" });

  if (status === "archived") {
    items.push({ kind: "action", label: "Restaurer en brouillon", icon: <RotateIcon />, onSelect: () => setStatus("draft") });
  } else {
    items.push({
      kind: "action",
      label: "Archiver",
      icon: <ArchiveIcon />,
      onSelect: () =>
        setConfirm({
          options: {
            title: `Archiver « ${name} » ?`,
            description: "Il disparaîtra du site et de la liste habituelle. Ses commandes restent consultables et vous pourrez le restaurer.",
            confirmLabel: "Archiver",
          },
          run: () => setStatus("archived"),
        }),
    });
  }
  if (status === "archived" || status === "draft") {
    items.push({
      kind: "action",
      label: "Supprimer définitivement",
      icon: <TrashIcon />,
      tone: "danger",
      onSelect: () =>
        setConfirm({
          options: {
            title: `Supprimer « ${name} » ?`,
            description: (
              <>
                La fiche, ses prix, ses caractéristiques et ses photos seront effacés.{" "}
                <strong className="font-semibold text-ink">Cette action est irréversible.</strong> Un produit présent dans une commande ne peut pas être supprimé.
              </>
            ),
            confirmLabel: "Supprimer définitivement",
            tone: "danger",
          },
          run: () => run(deleteProductAction, context === "edit" ? { id, then: "list" } : { id }),
        }),
    });
  }

  return (
    <span data-pending={pending ? "" : undefined} className="inline-flex items-center">
      {pending ? (
        <span className="flex size-9 items-center justify-center text-honey" role="status" aria-label="Action en cours">
          <Spinner />
        </span>
      ) : (
        <RowMenu
          label={`Actions pour ${name}`}
          items={items}
          trigger={context === "edit" ? <span className="flex items-center gap-1.5">Plus d’actions</span> : undefined}
          triggerClassName={
            context === "edit"
              ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition hover:border-parchment hover:bg-cream aria-expanded:bg-cream"
              : undefined
          }
        />
      )}
      <ConfirmDialog
        options={confirm?.options ?? null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
      />
    </span>
  );
}
