"use client";

import { useId, type ReactNode } from "react";
import { Notice, adminButton, adminInput, panelClass } from "@/components/admin/admin-ui";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatPrice } from "@/components/catalog/product-display";
import { MAX_LINES, MAX_QUANTITY, centsToInput, draftLineCents, tierUnitPriceCents, type DraftLine, type SaleProduct } from "@/lib/orders/admin-lines";

// Éléments communs aux formulaires de commande de l'admin (proposition de
// modification, vente manuelle) : sections, champs, erreurs, lignes.

export function FormSection({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${panelClass} scroll-mt-6 p-5 sm:p-6`}>
      <h2 id={`${id}-title`} className="font-display text-[18px] font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-[13px] leading-[1.5] text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[12.5px] leading-[1.45] text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Attributs d'accessibilité d'un champ en erreur. */
export function invalid(error: string | undefined, name: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};
}

export function FormErrors({ message, errors, labels }: { message: string; errors: Record<string, string>; labels: Record<string, string> }) {
  const entries = Object.keys(errors);
  return (
    <Notice tone="error">
      <p className="font-medium">{message}</p>
      {entries.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {entries.map((name) => (
            <li key={name}>
              <a href={`#${name}`} className="underline underline-offset-2 hover:no-underline">
                {labels[name] ?? name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </Notice>
  );
}

/** Ligne du formulaire : `edited` quand le prix a été changé à la main. */
export type EditorLine = DraftLine & { edited: boolean };

export function editorLine(product: SaleProduct, quantity = 1): EditorLine {
  return { productId: product.id, quantity, unitPrice: centsToInput(tierUnitPriceCents(product, quantity)), edited: false };
}

export function linesSubtotalCents(lines: EditorLine[]) {
  return lines.reduce((sum, line) => sum + (draftLineCents(line) ?? 0), 0);
}

const statusNames: Record<string, string> = { draft: "brouillon", hidden: "masqué", sold_out: "épuisé", archived: "archivé" };

/**
 * Lignes de produits : ajout depuis le catalogue, quantité, prix unitaire.
 * Le prix suit le palier de la quantité tant qu'il n'a pas été modifié à la
 * main. Envoyées au serveur en JSON (champ caché `lines`), qui vérifie tout.
 */
export function OrderLinesEditor({
  products,
  lines,
  onChange,
  error,
  stockWarning,
}: {
  products: SaleProduct[];
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
  error?: string;
  /** Texte affiché quand une quantité dépasse le stock actuel. */
  stockWarning: string;
}) {
  const addId = useId();
  const byId = new Map(products.map((product) => [product.id, product]));
  const available = products.filter((product) => !lines.some((line) => line.productId === product.id) && product.status !== "archived");
  const update = (index: number, change: Partial<EditorLine>) => {
    onChange(
      lines.map((line, position) => {
        if (position !== index) return line;
        const next = { ...line, ...change };
        const product = byId.get(line.productId);
        // Quantité changée, prix jamais touché : prix du nouveau palier.
        if (change.quantity !== undefined && !next.edited && product && Number.isInteger(next.quantity) && next.quantity >= 1) {
          next.unitPrice = centsToInput(tierUnitPriceCents(product, next.quantity));
        }
        return next;
      }),
    );
  };

  return (
    <div id="lines" className="scroll-mt-6 space-y-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })))} />
      {lines.length === 0 ? <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13.5px] text-muted">Aucun produit pour l’instant.</p> : null}
      <ul className="space-y-3">
        {lines.map((line, index) => {
          const product = byId.get(line.productId);
          const tierCents = product && line.quantity >= 1 ? tierUnitPriceCents(product, line.quantity) : null;
          const amount = draftLineCents(line);
          const short = product?.stock !== null && product?.stock !== undefined && line.quantity > product.stock;
          const quantityId = `${addId}-q${index}`;
          const priceId = `${addId}-p${index}`;
          return (
            <li key={line.productId} className="rounded-xl border border-line/80 bg-cream/40 p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{product?.name ?? "Produit retiré du catalogue"}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {product?.sku ? `${product.sku} · ` : ""}
                    {product?.stock !== null && product?.stock !== undefined
                      ? `stock actuel ${product.stock}`
                      : product?.purchaseMode === "reservation"
                        ? "réservation, sans stock décompté"
                        : "sur devis, sans stock décompté"}
                    {product && statusNames[product.status] ? ` · ${statusNames[product.status]}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(lines.filter((_, position) => position !== index))}
                  className={adminButton.icon}
                  aria-label={`Retirer ${product?.name ?? "ce produit"}`}
                  title="Retirer"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
                <div>
                  <label htmlFor={quantityId} className="mb-1 block text-[12.5px] text-muted">
                    Quantité
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${adminButton.icon} size-10 rounded-r-none border border-line bg-white`}
                      onClick={() => update(index, { quantity: Math.max(1, line.quantity - 1) })}
                      aria-label="Un de moins"
                      disabled={line.quantity <= 1}
                    >
                      <MinusIcon className="size-4" />
                    </button>
                    <input
                      id={quantityId}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QUANTITY}
                      value={Number.isNaN(line.quantity) ? "" : line.quantity}
                      onChange={(event) => update(index, { quantity: event.target.value === "" ? Number.NaN : Math.trunc(Number(event.target.value)) })}
                      className={`${adminInput} h-10 w-16 rounded-none border-x-0 text-center tabular-nums`}
                    />
                    <button
                      type="button"
                      className={`${adminButton.icon} size-10 rounded-l-none border border-line bg-white`}
                      onClick={() => update(index, { quantity: Math.min(MAX_QUANTITY, (Number.isNaN(line.quantity) ? 0 : line.quantity) + 1) })}
                      aria-label="Un de plus"
                    >
                      <PlusIcon className="size-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor={priceId} className="mb-1 block text-[12.5px] text-muted">
                    Prix unitaire (€)
                  </label>
                  <input
                    id={priceId}
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(event) => update(index, { unitPrice: event.target.value, edited: true })}
                    aria-invalid={amount === null ? true : undefined}
                    className={`${adminInput} h-10 w-28 tabular-nums`}
                  />
                </div>
                <p className="ml-auto pb-2 text-[15px] font-semibold text-ink tabular-nums">{amount === null ? "—" : formatPrice(amount / 100)}</p>
              </div>
              {line.edited && tierCents !== null ? (
                <p className="mt-2 text-[12.5px] text-muted">
                  Prix modifié (palier : {formatPrice(tierCents / 100)}).{" "}
                  <button
                    type="button"
                    onClick={() => update(index, { unitPrice: centsToInput(tierCents), edited: false })}
                    className="font-medium text-honey-dark hover:underline"
                  >
                    Revenir au prix du palier
                  </button>
                </p>
              ) : null}
              {amount === null ? <p className="mt-2 text-[12.5px] font-medium text-red-700">Prix ou quantité invalide.</p> : null}
              {short ? (
                <p className="mt-2 text-[12.5px] font-medium text-orange-800">
                  Plus que {product?.stock} en stock : {stockWarning}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {lines.length < MAX_LINES && available.length ? (
        <div>
          <label htmlFor={addId} className="sr-only">
            Ajouter un produit
          </label>
          <select
            id={addId}
            value=""
            onChange={(event) => {
              const product = byId.get(event.target.value);
              if (product) onChange([...lines, editorLine(product)]);
            }}
            className={`${adminInput} h-10`}
          >
            <option value="">+ Ajouter un produit…</option>
            {available.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.stock !== null ? ` (stock ${product.stock})` : ""}
                {statusNames[product.status] ? ` — ${statusNames[product.status]}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? <p className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
