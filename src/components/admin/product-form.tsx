"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveProductAction, type ProductFormState } from "@/app/admin/produits/actions";
import { Spinner } from "@/components/admin/action-button";
import { adminButton, adminInput, Notice, panelClass } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ProductCard } from "@/components/catalog/product-card";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { readinessChecks } from "@/lib/admin/product-health";
import {
  conditionLabels,
  deliveryModeLabels,
  priceVisibilityLabels,
  productStatusLabels,
  purchaseModeLabels,
  stockDisplayModeLabels,
  stockStatusLabelLabels,
} from "@/lib/catalog/labels";
import {
  buildPreviewProduct,
  previewSourceFromForm,
  type PreviewSource,
} from "@/lib/catalog/product-preview";
import { formatOrderDate } from "@/lib/orders/labels";

type Values = Record<string, string | boolean>;
type Row = { key: number; [field: string]: string | number };
type Tier = { min: number; max: number | null; price: number };

const FORM_ID = "product-form";

const defaults: Values = {
  status: "draft",
  priceVisibility: "visible",
  purchaseMode: "standard",
  condition: "new",
  deliveryMode: "quote",
  stockDisplayMode: "status_label",
  stockStatusLabel: "available",
  stockQuantity: "0",
  displayOrder: "0",
  saleUnit: "essaim",
  featured: false,
};

// Libellés du résumé des erreurs (ancres vers les champs).
const fieldLabels: Record<string, string> = {
  name: "Nom",
  tagline: "Sous-titre",
  categoryId: "Catégorie",
  status: "Statut",
  sku: "Référence interne",
  slug: "Lien de la fiche",
  displayOrder: "Ordre d’affichage",
  shortDescription: "Description courte",
  longDescription: "Description détaillée",
  basePrice: "Prix de vente",
  saleUnit: "Unité de vente",
  priceVisibility: "Affichage du prix",
  purchaseMode: "Mode d’achat",
  compareAtPrice: "Prix de référence",
  tiers: "Paliers dégressifs",
  stockQuantity: "Stock réel",
  lowStockThreshold: "Seuil d’alerte",
  stockDisplayMode: "Affichage du stock",
  stockStatusLabel: "Statut affiché",
  stockCustomMessage: "Message affiché",
  seasonLabel: "Période de disponibilité",
  attributes: "Caractéristiques",
  deliveryMode: "Transport",
  condition: "État",
  defectDescription: "Défauts constatés",
  seoTitle: "Titre SEO",
  seoDescription: "Description SEO",
};

const initialState: ProductFormState = { status: "idle", message: "", errors: {} };
let nextKey = 1;

function Field({
  label,
  name,
  error,
  hint,
  children,
  wide = false,
  counter,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  counter?: { length: number; max: number };
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-[13.5px] font-medium text-ink">
          {label}
        </label>
        {counter ? (
          <span
            className={`text-[11.5px] tabular-nums ${counter.length > counter.max ? "text-red-700" : "text-muted"}`}
            aria-hidden
          >
            {counter.length}/{counter.max}
          </span>
        ) : null}
      </div>
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

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${panelClass} scroll-mt-6 p-5 sm:p-6`}>
      <h2 id={`${id}-title`} className="font-display text-[18px] font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function AdvancedOptions({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (open && detailsRef.current) detailsRef.current.open = true;
  }, [open]);
  return (
    <details ref={detailsRef} className="group rounded-xl border border-line/80 bg-cream/50 sm:col-span-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13.5px] font-medium text-ink">
        {title}
        <PlusIcon className="size-4 text-muted transition group-open:rotate-45" />
      </summary>
      <div className="grid gap-x-5 gap-y-4 border-t border-line/70 p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

function Select({
  name,
  value,
  options,
  onChange,
  invalid,
  form,
}: {
  name: string;
  value: string;
  options: Record<string, string>;
  onChange?: (value: string) => void;
  invalid?: boolean;
  form?: string;
}) {
  return (
    <select
      id={name}
      name={name}
      form={form}
      defaultValue={onChange ? undefined : value}
      value={onChange ? value : undefined}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      aria-invalid={invalid || undefined}
      className={`${adminInput} h-10`}
    >
      {Object.entries(options).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

function sourceFromValues(values: Values, tiers: Tier[]): PreviewSource {
  const lists: Record<string, string[]> = {
    tierMin: tiers.map((tier) => String(tier.min)),
    tierMax: tiers.map((tier) => (tier.max === null ? "" : String(tier.max))),
    tierPrice: tiers.map((tier) => String(tier.price).replace(".", ",")),
  };
  return {
    get: (name) => (name === "featured" ? (values.featured === true ? "on" : "") : String(values[name] ?? "")),
    getAll: (name) => lists[name] ?? [],
  };
}

export function ProductForm({
  productId,
  updatedAt,
  initialValues,
  initialTiers,
  initialAttributes,
  categories,
  photos,
  imageCount,
  coverUrl,
}: {
  productId: string | null;
  updatedAt: string | null;
  initialValues: Values | null;
  initialTiers: Tier[];
  initialAttributes: { label: string; value: string; unit: string | null }[];
  categories: { id: string; name: string }[];
  /** Gestion des photos (formulaires distincts, hors du formulaire produit). */
  photos: ReactNode;
  imageCount: number;
  coverUrl: string | null;
}) {
  const values = { ...defaults, ...(initialValues ?? {}) };
  const text = (name: string) => String(values[name] ?? "");
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const errors = state.errors;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const [stockMode, setStockMode] = useState(text("stockDisplayMode"));
  const [condition, setCondition] = useState(text("condition"));
  const [tiers, setTiers] = useState<Row[]>(
    initialTiers.map((tier) => ({
      key: nextKey++,
      min: String(tier.min),
      max: tier.max === null ? "" : String(tier.max),
      price: String(tier.price).replace(".", ","),
    })),
  );
  const [attributes, setAttributes] = useState<Row[]>(
    initialAttributes.map((attribute) => ({
      key: nextKey++,
      label: attribute.label,
      value: attribute.value,
      unit: attribute.unit ?? "",
    })),
  );
  // Saisie en cours (aperçu, liste de contrôle, compteurs) et état « modifié ».
  const [snapshot, setSnapshot] = useState<FormData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  const source = snapshot ? previewSourceFromForm(snapshot) : sourceFromValues(values, initialTiers);
  const preview = buildPreviewProduct(source, { id: productId ?? "nouveau", coverUrl, categories });
  const checks = readinessChecks({
    imageCount,
    shortDescription: source.get("shortDescription"),
    categoryId: source.get("categoryId"),
    basePrice: source.get("basePrice"),
    priceVisibility: source.get("priceVisibility"),
    purchaseMode: source.get("purchaseMode"),
    stockQuantity: source.get("stockQuantity"),
  });
  const missing = checks.filter((check) => !check.ok).length;
  const counter = (name: string, max: number) => ({ length: source.get(name).length, max });

  function captureChange() {
    if (formRef.current) setSnapshot(new FormData(formRef.current));
    setDirty(true);
  }

  useEffect(() => {
    if (state.status === "error") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  // Quitter la page avec des modifications non enregistrées demande
  // confirmation (fermeture de l'onglet comme lien interne).
  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, pending]);

  const input = (name: string, extra: Record<string, unknown> = {}) => ({
    id: name,
    name,
    defaultValue: text(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: `${adminInput} h-10`,
    ...extra,
  });

  const saveLabel = productId ? "Enregistrer" : "Créer le brouillon";
  const errorEntries = Object.entries(errors);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <div ref={topRef} className="scroll-mt-20 empty:hidden">
          {state.status === "error" ? (
            <Notice tone="error">
              <p className="font-medium">{state.message}</p>
              {errorEntries.length ? (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {errorEntries.map(([name]) => (
                    <li key={name}>
                      <a href={`#${name === "tiers" ? "section-prix" : name === "attributes" ? "section-caracteristiques" : name}`} className="underline underline-offset-2 hover:no-underline">
                        {fieldLabels[name] ?? name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Notice>
          ) : null}
        </div>

        {photos}

        <form
          id={FORM_ID}
          ref={formRef}
          noValidate
          className="space-y-5"
          onChange={captureChange}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => action(formData));
          }}
        >
          {productId ? <input type="hidden" name="id" value={productId} /> : null}
          {updatedAt ? <input type="hidden" name="expectedUpdatedAt" value={updatedAt} /> : null}

          <Section id="section-informations" title="Informations générales" description="Ce qui permet de reconnaître le produit dans le catalogue.">
            <Field label="Nom *" name="name" error={errors.name} counter={counter("name", 120)} wide>
              <input {...input("name", { required: true, maxLength: 120, placeholder: "Essaim Buckfast sur 5 cadres" })} />
            </Field>
            <Field label="Sous-titre" name="tagline" error={errors.tagline} hint="Affiché sous le nom, ex. « Doux et productif, idéal pour démarrer »." counter={counter("tagline", 90)}>
              <input {...input("tagline", { maxLength: 90 })} />
            </Field>
            <Field label="Catégorie" name="categoryId" error={errors.categoryId} hint={categories.length === 0 ? <>Aucune catégorie : <Link href="/admin/categories" className="text-honey-dark underline">créez-en une</Link>.</> : undefined}>
              <select id="categoryId" name="categoryId" defaultValue={text("categoryId")} className={`${adminInput} h-10`}>
                <option value="">Sans catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <AdvancedOptions title="Référence, lien et ordre d’affichage" open={Boolean(errors.sku || errors.slug || errors.displayOrder)}>
              <Field label="Référence interne" name="sku" error={errors.sku} hint="Facultative et unique, ex. ESS-BUCK-5.">
                <input {...input("sku", { maxLength: 40 })} />
              </Field>
              <Field label="Lien de la fiche" name="slug" error={errors.slug} hint="Laissé vide, il est déduit du nom.">
                <input {...input("slug", { maxLength: 80, placeholder: "essaim-buckfast-5-cadres" })} />
              </Field>
              <Field label="Ordre d’affichage" name="displayOrder" error={errors.displayOrder} hint="Les plus petits nombres apparaissent en premier.">
                <input {...input("displayOrder", { inputMode: "numeric" })} />
              </Field>
            </AdvancedOptions>
          </Section>

          <Section id="section-presentation" title="Présentation" description="Les textes que lisent vos clients.">
            <Field label="Description courte" name="shortDescription" error={errors.shortDescription} hint="Une ou deux phrases, affichées sur la carte du catalogue." counter={counter("shortDescription", 300)} wide>
              <textarea {...input("shortDescription", { rows: 3, maxLength: 300, className: `${adminInput} py-2.5 leading-[1.5]` })} />
            </Field>
            <Field label="Description détaillée" name="longDescription" error={errors.longDescription} hint="Affichée sur la fiche complète : origine, caractère, conseils…" counter={counter("longDescription", 5000)} wide>
              <textarea {...input("longDescription", { rows: 8, maxLength: 5000, className: `${adminInput} py-2.5 leading-[1.55]` })} />
            </Field>
          </Section>

          <Section id="section-prix" title="Prix" description="Montants TTC en euros. Les paliers remplacent le prix de base selon la quantité commandée.">
            <Field label="Prix de vente *" name="basePrice" error={errors.basePrice}>
              <div className="relative">
                <input {...input("basePrice", { inputMode: "decimal", placeholder: "160", className: `${adminInput} h-10 pr-9` })} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-muted">€</span>
              </div>
            </Field>
            <Field label="Unité de vente" name="saleUnit" error={errors.saleUnit} hint="Affichée après le prix : « /essaim », « /reine »…">
              <input {...input("saleUnit", { maxLength: 30 })} />
            </Field>
            <Field label="Affichage du prix" name="priceVisibility" error={errors.priceVisibility}>
              <Select name="priceVisibility" value={text("priceVisibility")} options={priceVisibilityLabels} />
            </Field>
            <Field label="Mode d’achat" name="purchaseMode" error={errors.purchaseMode}>
              <Select name="purchaseMode" value={text("purchaseMode")} options={purchaseModeLabels} />
            </Field>

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13.5px] font-medium text-ink">Paliers dégressifs</p>
                <p className="text-[12.5px] text-muted">Ex. 1 à 4 : 160 € · 5 à 9 : 150 € · 10 et plus : 145 €</p>
              </div>
              {errors.tiers ? <p className="mt-1 text-[12.5px] font-medium text-red-700">{errors.tiers}</p> : null}
              {tiers.length ? (
                <div className="mt-3 space-y-2">
                  <div aria-hidden className="grid grid-cols-[1fr_1fr_1.2fr_2.25rem] gap-2 text-[11.5px] text-muted">
                    <span>De (quantité)</span>
                    <span>À (vide = et plus)</span>
                    <span>Prix unitaire</span>
                  </div>
                  {tiers.map((tier, index) => (
                    <div key={tier.key} className="grid grid-cols-[1fr_1fr_1.2fr_2.25rem] items-center gap-2">
                      <input name="tierMin" defaultValue={tier.min} inputMode="numeric" placeholder="1" aria-label={`Palier ${index + 1} : quantité minimale`} className={`${adminInput} h-10`} />
                      <input name="tierMax" defaultValue={tier.max} inputMode="numeric" placeholder="et plus" aria-label={`Palier ${index + 1} : quantité maximale`} className={`${adminInput} h-10`} />
                      <input name="tierPrice" defaultValue={tier.price} inputMode="decimal" placeholder="150" aria-label={`Palier ${index + 1} : prix unitaire`} className={`${adminInput} h-10`} />
                      <button
                        type="button"
                        onClick={() => {
                          setTiers((rows) => rows.filter((row) => row.key !== tier.key));
                          setDirty(true);
                        }}
                        className={adminButton.icon}
                        aria-label={`Retirer le palier ${index + 1}`}
                        title="Retirer"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setTiers((rows) => [...rows, { key: nextKey++, min: "", max: "", price: "" }]);
                  setDirty(true);
                }}
                className={`${adminButton.small} mt-3`}
              >
                <PlusIcon className="size-3.5" />
                Ajouter un palier
              </button>
            </div>

            <AdvancedOptions title="Promotion et prix barré" open={Boolean(errors.compareAtPrice) || Boolean(text("compareAtPrice"))}>
              <Field label="Prix de référence (barré)" name="compareAtPrice" error={errors.compareAtPrice} hint="Seulement pour une vraie réduction : le prix de référence doit être le plus bas pratiqué dans les 30 derniers jours." wide>
                <input {...input("compareAtPrice", { inputMode: "decimal" })} />
              </Field>
            </AdvancedOptions>
          </Section>

          <Section id="section-stock" title="Stock et disponibilité" description="Le stock réel reste privé : choisissez ce que voient vos clients.">
            <Field label="Stock réel" name="stockQuantity" error={errors.stockQuantity}>
              <input {...input("stockQuantity", { inputMode: "numeric" })} />
            </Field>
            <Field label="M’alerter à partir de" name="lowStockThreshold" error={errors.lowStockThreshold} hint="Signalé au tableau de bord quand le stock atteint ce seuil.">
              <input {...input("lowStockThreshold", { inputMode: "numeric", placeholder: "Pas d’alerte" })} />
            </Field>
            <Field label="Que montrer aux clients ?" name="stockDisplayMode" error={errors.stockDisplayMode}>
              <Select name="stockDisplayMode" value={stockMode} options={stockDisplayModeLabels} onChange={setStockMode} />
            </Field>
            {stockMode === "status_label" ? (
              <Field label="Statut affiché" name="stockStatusLabel" error={errors.stockStatusLabel}>
                <Select name="stockStatusLabel" value={text("stockStatusLabel") || "available"} options={stockStatusLabelLabels} />
              </Field>
            ) : null}
            {stockMode === "custom_message" ? (
              <Field label="Message affiché" name="stockCustomMessage" error={errors.stockCustomMessage} hint="Ex. « Réservations ouvertes — saison 2027 »." counter={counter("stockCustomMessage", 80)}>
                <input {...input("stockCustomMessage", { maxLength: 80 })} />
              </Field>
            ) : null}
            <Field label="Période de disponibilité" name="seasonLabel" error={errors.seasonLabel} hint="Ex. « Avril – juin »." wide={stockMode === "hidden" || stockMode === "exact"}>
              <input {...input("seasonLabel", { maxLength: 60 })} />
            </Field>
          </Section>

          <Section id="section-caracteristiques" title="Caractéristiques" description="Race, nombre de cadres, type de ruche, année de la reine…">
            <div className="sm:col-span-2">
              {errors.attributes ? <p className="mb-2 text-[12.5px] font-medium text-red-700">{errors.attributes}</p> : null}
              {attributes.length ? (
                <div className="space-y-2">
                  <div aria-hidden className="grid grid-cols-[1fr_1.4fr_0.7fr_2.25rem] gap-2 text-[11.5px] text-muted">
                    <span>Libellé</span>
                    <span>Valeur</span>
                    <span>Unité</span>
                  </div>
                  {attributes.map((attribute, index) => (
                    <div key={attribute.key} className="grid grid-cols-[1fr_1.4fr_0.7fr_2.25rem] items-center gap-2">
                      <input name="attrLabel" defaultValue={attribute.label} placeholder="Race" aria-label={`Caractéristique ${index + 1} : libellé`} className={`${adminInput} h-10`} />
                      <input name="attrValue" defaultValue={attribute.value} placeholder="Buckfast" aria-label={`Caractéristique ${index + 1} : valeur`} className={`${adminInput} h-10`} />
                      <input name="attrUnit" defaultValue={attribute.unit} placeholder="—" aria-label={`Caractéristique ${index + 1} : unité`} className={`${adminInput} h-10`} />
                      <button
                        type="button"
                        onClick={() => {
                          setAttributes((rows) => rows.filter((row) => row.key !== attribute.key));
                          setDirty(true);
                        }}
                        className={adminButton.icon}
                        aria-label={`Retirer la caractéristique ${index + 1}`}
                        title="Retirer"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">
                  Aucune caractéristique. Elles s’affichent sous forme de tableau sur la fiche produit.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setAttributes((rows) => [...rows, { key: nextKey++, label: "", value: "", unit: "" }]);
                  setDirty(true);
                }}
                className={`${adminButton.small} mt-3`}
              >
                <PlusIcon className="size-3.5" />
                Ajouter une caractéristique
              </button>
            </div>
          </Section>

          <Section id="section-livraison" title="Livraison et état">
            <Field label="Transport" name="deliveryMode" error={errors.deliveryMode} hint="Pour le vivant, « retrait » ou « sur devis » sont les plus sûrs.">
              <Select name="deliveryMode" value={text("deliveryMode")} options={deliveryModeLabels} />
            </Field>
            <Field label="État" name="condition" error={errors.condition} hint="Pour le matériel d’occasion ou de second choix.">
              <Select name="condition" value={condition} options={conditionLabels} onChange={setCondition} />
            </Field>
            {condition !== "new" ? (
              <Field label="Défauts constatés" name="defectDescription" error={errors.defectDescription} wide>
                <textarea {...input("defectDescription", { rows: 3, maxLength: 2000, className: `${adminInput} py-2.5` })} />
              </Field>
            ) : null}
          </Section>

          <div className={`${panelClass} p-1`}>
            <AdvancedOptions title="Référencement Google (facultatif)" open={Boolean(errors.seoTitle || errors.seoDescription) || Boolean(text("seoTitle") || text("seoDescription"))}>
              <Field label="Titre SEO" name="seoTitle" error={errors.seoTitle} hint="Laissé vide, le nom du produit est utilisé." counter={counter("seoTitle", 70)} wide>
                <input {...input("seoTitle", { maxLength: 70 })} />
              </Field>
              <Field label="Description SEO" name="seoDescription" error={errors.seoDescription} hint="Laissée vide, la description courte est utilisée." counter={counter("seoDescription", 160)} wide>
                <textarea {...input("seoDescription", { rows: 2, maxLength: 160, className: `${adminInput} py-2.5` })} />
              </Field>
            </AdvancedOptions>
          </div>

          {/* Barre d'enregistrement sur mobile ; sur grand écran, elle est dans le panneau latéral. */}
          <div className="sticky bottom-0 z-30 -mx-4 border-t border-line/70 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-muted" aria-live="polite">
                {dirty ? "Modifications non enregistrées" : ""}
              </p>
              <button type="submit" disabled={pending} className={adminButton.primary}>
                {pending ? <Spinner /> : null}
                {pending ? "Enregistrement…" : saveLabel}
              </button>
            </div>
          </div>
        </form>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6" onChange={captureChange} aria-label="Publication et aperçu">
        <section className={`${panelClass} p-5`}>
          <h2 className="font-display text-[17px] font-semibold text-ink">Publication</h2>
          <div className="mt-4 space-y-4">
            {productId ? (
              <Field label="Statut" name="status" error={errors.status}>
                <Select name="status" value={text("status")} options={productStatusLabels} form={FORM_ID} />
              </Field>
            ) : (
              <>
                <input type="hidden" name="status" value="draft" form={FORM_ID} />
                <p className="rounded-lg bg-sand/70 px-3 py-2.5 text-[13px] leading-[1.5] text-body">
                  Le produit sera créé <strong className="font-semibold">en brouillon</strong>, invisible sur le site. Vous ajouterez ensuite ses photos avant de le publier.
                </p>
              </>
            )}
            <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg text-[13.5px] text-ink">
              <input
                type="checkbox"
                name="featured"
                form={FORM_ID}
                defaultChecked={values.featured === true}
                className="mt-0.5 size-4 shrink-0 accent-honey"
              />
              <span>
                Mettre en avant
                <span className="block text-[12.5px] text-muted">Badge « Populaire » sur la carte.</span>
              </span>
            </label>

            <div className="rounded-xl border border-line/70 bg-cream/50 p-3.5">
              <p className="flex items-center justify-between text-[13px] font-medium text-ink">
                Avant de publier
                <span className={`text-[12px] tabular-nums ${missing ? "text-orange-700" : "text-green-700"}`}>
                  {checks.length - missing}/{checks.length}
                </span>
              </p>
              <ul className="mt-2.5 space-y-2">
                {checks.map((check) => (
                  <li key={check.label} className="flex items-start gap-2.5 text-[12.5px] leading-[1.4]">
                    <span
                      className={`mt-px flex size-4 shrink-0 items-center justify-center rounded-full ${
                        check.ok ? "bg-green-600 text-white" : "border border-parchment bg-white"
                      }`}
                      aria-hidden
                    >
                      {check.ok ? <CheckIcon className="size-2.5" strokeWidth={3} /> : null}
                    </span>
                    <span className={check.ok ? "text-body" : "text-ink"}>
                      {check.label}
                      <span className="sr-only">{check.ok ? " : fait" : " : à compléter"}</span>
                      {!check.ok ? <span className="block text-muted">{check.hint}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 hidden space-y-2.5 border-t border-line/60 pt-4 lg:block">
            <button type="submit" form={FORM_ID} disabled={pending} className={`${adminButton.primary} w-full`}>
              {pending ? <Spinner /> : null}
              {pending ? "Enregistrement…" : saveLabel}
            </button>
            <Link href="/admin/produits" className={`${adminButton.ghost} w-full`}>
              Annuler
            </Link>
            <p className="text-center text-[12px] text-muted" aria-live="polite">
              {dirty
                ? "Modifications non enregistrées"
                : updatedAt
                  ? `Enregistré le ${formatOrderDate(updatedAt)}`
                  : ""}
            </p>
          </div>
        </section>

        <section className={`${panelClass} p-5`}>
          <h2 className="font-display text-[17px] font-semibold text-ink">Aperçu dans le catalogue</h2>
          <p className="mt-1 text-[12.5px] text-muted">Mis à jour pendant la saisie.</p>
          <div className="pointer-events-none mt-4 select-none" inert>
            <ProductCard product={preview} />
          </div>
        </section>
      </aside>

      <ConfirmDialog
        options={
          leaveTo
            ? {
                title: "Quitter sans enregistrer ?",
                description: "Vos modifications sur ce produit seront perdues.",
                confirmLabel: "Quitter la page",
                tone: "danger",
              }
            : null
        }
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const href = leaveTo;
          setLeaveTo(null);
          setDirty(false);
          if (href) router.push(href);
        }}
      />
    </div>
  );
}
