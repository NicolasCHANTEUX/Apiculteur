"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveProductAction, type ProductFormState } from "@/app/admin/produits/actions";
import { adminButton, adminInput, Notice } from "@/components/admin/admin-ui";
import {
  conditionLabels,
  deliveryModeLabels,
  priceVisibilityLabels,
  productStatusLabels,
  purchaseModeLabels,
  stockDisplayModeLabels,
  stockStatusLabelLabels,
} from "@/lib/catalog/labels";

type Values = Record<string, string | boolean>;
type Row = { key: number; [field: string]: string | number };

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

const initialState: ProductFormState = { status: "idle", message: "", errors: {} };
let nextKey = 1;

function Field({
  label,
  name,
  error,
  hint,
  children,
  wide = false,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="mb-1.5 block text-[13px] text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-[12.5px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-line/70 bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.06)]"
    >
      <h2 id={id} className="font-display text-[17px] font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-0.5 text-[12.5px] text-muted">{description}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Select({
  name,
  value,
  options,
  onChange,
  invalid,
}: {
  name: string;
  value: string;
  options: Record<string, string>;
  onChange?: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <select
      id={name}
      name={name}
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

export function ProductForm({
  productId,
  updatedAt,
  initialValues,
  initialTiers,
  initialAttributes,
  categories,
}: {
  productId: string | null;
  updatedAt: string | null;
  initialValues: Values | null;
  initialTiers: { min: number; max: number | null; price: number }[];
  initialAttributes: { label: string; value: string; unit: string | null }[];
  categories: { id: string; name: string }[];
}) {
  const values = { ...defaults, ...(initialValues ?? {}) };
  const text = (name: string) => String(values[name] ?? "");
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const errors = state.errors;
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

  useEffect(() => {
    if (state.status === "error") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  const input = (name: string, extra: Record<string, unknown> = {}) => ({
    id: name,
    name,
    defaultValue: text(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: `${adminInput} h-10`,
    ...extra,
  });

  return (
    <form
      noValidate
      className="space-y-5 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <div ref={topRef} className="scroll-mt-24">
        {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      </div>
      {productId ? <input type="hidden" name="id" value={productId} /> : null}
      {updatedAt ? <input type="hidden" name="expectedUpdatedAt" value={updatedAt} /> : null}

      <Section title="Identité" description="Ce qui identifie le produit dans le catalogue et l’administration.">
        <Field label="Nom *" name="name" error={errors.name}>
          <input {...input("name", { required: true, maxLength: 120 })} />
        </Field>
        <Field label="Accroche" name="tagline" error={errors.tagline} hint="Ligne sous le nom, ex. « Buckfast · Reine fécondée et testée »">
          <input {...input("tagline", { maxLength: 90 })} />
        </Field>
        <Field label="Catégorie" name="categoryId" error={errors.categoryId}>
          <select id="categoryId" name="categoryId" defaultValue={text("categoryId")} className={`${adminInput} h-10`}>
            <option value="">Sans catégorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Référence" name="sku" error={errors.sku} hint="Facultative, unique (ex. ESS-BUCK-5)">
          <input {...input("sku", { maxLength: 40 })} />
        </Field>
        <Field label="Statut" name="status" error={errors.status} hint="Seuls les produits publiés sont visibles sur le site.">
          <Select name="status" value={text("status")} options={productStatusLabels} />
        </Field>
        <Field label="Lien de la fiche" name="slug" error={errors.slug} hint="Laissé vide : déduit du nom.">
          <input {...input("slug", { maxLength: 80, placeholder: "essaim-buckfast-5-cadres" })} />
        </Field>
        <Field label="Ordre d’affichage" name="displayOrder" error={errors.displayOrder} hint="Les plus petits apparaissent en premier.">
          <input {...input("displayOrder", { inputMode: "numeric" })} />
        </Field>
        <div className="flex items-end">
          <label className="flex min-h-10 items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" name="featured" defaultChecked={values.featured === true} className="size-4 accent-honey" />
            Mettre en avant (badge « Populaire »)
          </label>
        </div>
      </Section>

      <Section title="Présentation">
        <Field label="Description courte" name="shortDescription" error={errors.shortDescription} hint="300 caractères, affichée sur les cartes." wide>
          <textarea {...input("shortDescription", { rows: 2, maxLength: 300, className: `${adminInput} py-2` })} />
        </Field>
        <Field label="Description détaillée" name="longDescription" error={errors.longDescription} wide>
          <textarea {...input("longDescription", { rows: 7, maxLength: 5000, className: `${adminInput} py-2` })} />
        </Field>
      </Section>

      <Section title="Prix" description="Montants TTC en euros. Les paliers remplacent le prix de base selon la quantité.">
        <Field label="Prix de vente *" name="basePrice" error={errors.basePrice}>
          <input {...input("basePrice", { inputMode: "decimal", placeholder: "160" })} />
        </Field>
        <Field label="Prix barré" name="compareAtPrice" error={errors.compareAtPrice} hint="Facultatif. Doit être le prix le plus bas pratiqué ces 30 derniers jours (réglementation des réductions).">
          <input {...input("compareAtPrice", { inputMode: "decimal" })} />
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
          <p className="text-[13px] text-ink">Paliers dégressifs</p>
          <p className="text-[12px] text-muted">
            Ex. 1 à 4 : 160 € · 5 à 9 : 150 € · à partir de 10 (max vide) : 145 €.
          </p>
          {errors.tiers ? <p className="mt-1 text-[12.5px] text-red-700">{errors.tiers}</p> : null}
          <div className="mt-3 space-y-2">
            {tiers.map((tier, index) => (
              <div key={tier.key} className="grid grid-cols-[1fr_1fr_1.2fr_auto] items-center gap-2">
                <input name="tierMin" defaultValue={tier.min} inputMode="numeric" placeholder="Qté min" aria-label={`Palier ${index + 1} : quantité minimale`} className={`${adminInput} h-10`} />
                <input name="tierMax" defaultValue={tier.max} inputMode="numeric" placeholder="Qté max" aria-label={`Palier ${index + 1} : quantité maximale`} className={`${adminInput} h-10`} />
                <input name="tierPrice" defaultValue={tier.price} inputMode="decimal" placeholder="Prix unitaire" aria-label={`Palier ${index + 1} : prix unitaire`} className={`${adminInput} h-10`} />
                <button type="button" onClick={() => setTiers((rows) => rows.filter((row) => row.key !== tier.key))} className={adminButton.small} aria-label={`Retirer le palier ${index + 1}`}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTiers((rows) => [...rows, { key: nextKey++, min: "", max: "", price: "" }])} className={`${adminButton.small} mt-2`}>
            + Ajouter un palier
          </button>
        </div>
      </Section>

      <Section title="Stock et disponibilité" description="Le stock réel reste privé ; choisissez ce que voit le public.">
        <Field label="Stock réel" name="stockQuantity" error={errors.stockQuantity}>
          <input {...input("stockQuantity", { inputMode: "numeric" })} />
        </Field>
        <Field label="Seuil d’alerte" name="lowStockThreshold" error={errors.lowStockThreshold} hint="Alerte au tableau de bord en dessous.">
          <input {...input("lowStockThreshold", { inputMode: "numeric" })} />
        </Field>
        <Field label="Ce que voit le public" name="stockDisplayMode" error={errors.stockDisplayMode}>
          <Select name="stockDisplayMode" value={stockMode} options={stockDisplayModeLabels} onChange={setStockMode} />
        </Field>
        {stockMode === "status_label" ? (
          <Field label="Libellé" name="stockStatusLabel" error={errors.stockStatusLabel}>
            <Select name="stockStatusLabel" value={text("stockStatusLabel") || "available"} options={stockStatusLabelLabels} />
          </Field>
        ) : null}
        {stockMode === "custom_message" ? (
          <Field label="Message affiché" name="stockCustomMessage" error={errors.stockCustomMessage} hint="Ex. « Réservations ouvertes — saison 2027 »">
            <input {...input("stockCustomMessage", { maxLength: 80 })} />
          </Field>
        ) : null}
        <Field label="Période de disponibilité" name="seasonLabel" error={errors.seasonLabel} hint="Ex. « Avril – juin »">
          <input {...input("seasonLabel", { maxLength: 60 })} />
        </Field>
      </Section>

      <Section title="Caractéristiques" description="Race, nombre de cadres, type de ruche, année de la reine…">
        <div className="sm:col-span-2">
          {errors.attributes ? <p className="mb-2 text-[12.5px] text-red-700">{errors.attributes}</p> : null}
          <div className="space-y-2">
            {attributes.map((attribute, index) => (
              <div key={attribute.key} className="grid grid-cols-[1fr_1.4fr_0.7fr_auto] items-center gap-2">
                <input name="attrLabel" defaultValue={attribute.label} placeholder="Libellé (Race)" aria-label={`Caractéristique ${index + 1} : libellé`} className={`${adminInput} h-10`} />
                <input name="attrValue" defaultValue={attribute.value} placeholder="Valeur (Buckfast)" aria-label={`Caractéristique ${index + 1} : valeur`} className={`${adminInput} h-10`} />
                <input name="attrUnit" defaultValue={attribute.unit} placeholder="Unité" aria-label={`Caractéristique ${index + 1} : unité`} className={`${adminInput} h-10`} />
                <button type="button" onClick={() => setAttributes((rows) => rows.filter((row) => row.key !== attribute.key))} className={adminButton.small} aria-label={`Retirer la caractéristique ${index + 1}`}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAttributes((rows) => [...rows, { key: nextKey++, label: "", value: "", unit: "" }])} className={`${adminButton.small} mt-2`}>
            + Ajouter une caractéristique
          </button>
        </div>
      </Section>

      <Section title="Transport et état">
        <Field label="Transport" name="deliveryMode" error={errors.deliveryMode} hint="Pour le vivant, « retrait » ou « sur devis » sont les plus sûrs.">
          <Select name="deliveryMode" value={text("deliveryMode")} options={deliveryModeLabels} />
        </Field>
        <Field label="État" name="condition" error={errors.condition}>
          <Select name="condition" value={condition} options={conditionLabels} onChange={setCondition} />
        </Field>
        {condition !== "new" ? (
          <Field label="Défauts constatés" name="defectDescription" error={errors.defectDescription} wide>
            <textarea {...input("defectDescription", { rows: 3, maxLength: 2000, className: `${adminInput} py-2` })} />
          </Field>
        ) : null}
      </Section>

      <Section title="Référencement" description="Facultatif : titre et description pour les moteurs de recherche.">
        <Field label="Titre SEO" name="seoTitle" error={errors.seoTitle} hint="70 caractères au maximum.">
          <input {...input("seoTitle", { maxLength: 70 })} />
        </Field>
        <Field label="Description SEO" name="seoDescription" error={errors.seoDescription} hint="160 caractères au maximum.">
          <input {...input("seoDescription", { maxLength: 160 })} />
        </Field>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-end gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin/produits" className={adminButton.secondary}>
            Annuler
          </Link>
          <button type="submit" disabled={pending} className={adminButton.primary}>
            {pending ? "Enregistrement…" : productId ? "Enregistrer" : "Créer le produit"}
          </button>
        </div>
      </div>
    </form>
  );
}
