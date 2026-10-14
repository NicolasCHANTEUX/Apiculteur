"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { approveLegalAction, saveLegalDraftAction } from "@/app/admin/informations-legales/actions";
import { Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { CheckIcon, EyeIcon } from "@/components/icons";
import { checkLegalConfig, legalFields, legalForms, parseLegalForm, retentionFields, type LegalCheck, type LegalConfig } from "@/lib/legal/config";

type TextField = keyof typeof legalFields;

const sections: { title: string; description?: string; fields: TextField[] }[] = [
  {
    title: "L’exploitation",
    fields: ["businessName", "legalForm", "ownerName", "addressLine", "postalCode", "city", "siret", "registration", "beekeeperNumber", "email", "phone"],
  },
  { title: "Publication et hébergement", fields: ["publicationDirector", "hostName", "hostAddress", "hostWebsite", "dataHost"] },
  {
    title: "Médiation de la consommation",
    description: "Obligatoire pour vendre à des particuliers : choisissez un médiateur référencé par la Commission d’évaluation et de contrôle de la médiation de la consommation (CECMC).",
    fields: ["mediatorName", "mediatorWebsite"],
  },
  {
    title: "Conditions de vente",
    description: "Les textes marqués « [À faire valider] » sont des propositions : faites-les relire (en particulier pour les animaux vivants) puis retirez la mention.",
    fields: ["paymentTerms", "deliveryTerms", "withdrawalTerms", "warrantyTerms", "reservationTerms"],
  },
];

const wide = new Set<TextField>(["businessName", "addressLine", "dataHost", "paymentTerms", "deliveryTerms", "withdrawalTerms", "warrantyTerms", "reservationTerms", "mediatorName", "mediatorWebsite", "hostAddress"]);

function fieldState(check: LegalCheck, field: TextField) {
  if (check.invalid[field]) return { tone: "error", text: check.invalid[field] } as const;
  if (check.placeholders.includes(field)) return { tone: "warning", text: "Valeur provisoire : à remplacer ou valider." } as const;
  if (check.missing.includes(field)) return { tone: "missing", text: "À compléter." } as const;
  return null;
}

function Field({ field, check, children }: { field: TextField; check: LegalCheck; children: ReactNode }) {
  const meta = legalFields[field];
  const state = fieldState(check, field);
  return (
    <div className={wide.has(field) ? "sm:col-span-2" : undefined}>
      <label htmlFor={field} className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-medium text-ink">
        <span>
          {meta.label}
          {meta.required ? null : <span className="font-normal text-muted"> (facultatif)</span>}
        </span>
        {state ? (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
              state.tone === "error" ? "bg-red-50 text-red-700" : state.tone === "warning" ? "bg-orange-50 text-orange-800" : "bg-sand text-brown"
            }`}
          >
            {state.tone === "error" ? "Invalide" : state.tone === "warning" ? "Provisoire" : "Manquant"}
          </span>
        ) : null}
      </label>
      {children}
      {state && state.tone !== "missing" ? (
        <p id={`${field}-state`} className={`mt-1 text-[12px] ${state.tone === "error" ? "text-red-700" : "text-orange-800"}`}>
          {state.text}
        </p>
      ) : meta.hint ? (
        <p className="mt-1 text-[12px] text-muted">{meta.hint}</p>
      ) : null}
    </div>
  );
}

function fields(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form).entries()) if (typeof value === "string") values[name] = value;
  return values;
}

/** Formulaire des informations légales, contrôlé en direct. */
export function LegalForm({ initial }: { initial: LegalConfig }) {
  const { run, pending } = useAdminAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [config, setConfig] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const check = checkLegalConfig(config);
  const problems = check.missing.length + check.placeholders.length + Object.keys(check.invalid).length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  const input = (field: TextField) => ({
    id: field,
    name: field,
    defaultValue: initial[field],
    maxLength: legalFields[field].max,
    "aria-invalid": check.invalid[field] ? true : undefined,
    "aria-describedby": fieldState(check, field) ? `${field}-state` : undefined,
  });

  return (
    <form
      ref={formRef}
      onChange={(event) => {
        setConfig(parseLegalForm(new FormData(event.currentTarget)));
        setDirty(true);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        run(saveLegalDraftAction, fields(event.currentTarget));
        setDirty(false);
      }}
      className="space-y-6"
    >
      <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-white/95 px-5 py-3.5 shadow-[0_8px_24px_-18px_rgb(61_43_26/0.35)] backdrop-blur">
        <p className="text-[13.5px]">
          {problems === 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
              <CheckIcon className="size-4" /> Complet : prêt à être approuvé
            </span>
          ) : (
            <span className="text-body">
              <span className="font-semibold text-ink">{problems}</span> point{problems > 1 ? "s" : ""} à régler avant publication
              {check.missing.length ? ` · ${check.missing.length} manquant${check.missing.length > 1 ? "s" : ""}` : ""}
              {check.placeholders.length ? ` · ${check.placeholders.length} provisoire${check.placeholders.length > 1 ? "s" : ""}` : ""}
              {Object.keys(check.invalid).length ? ` · ${Object.keys(check.invalid).length} invalide${Object.keys(check.invalid).length > 1 ? "s" : ""}` : ""}
            </span>
          )}
          {dirty ? <span className="ml-2 text-[12px] text-muted">· modifications non enregistrées</span> : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={adminButton.secondary}>
            {pending ? <Spinner /> : null}
            Enregistrer le brouillon
          </button>
          <button type="button" disabled={pending || problems > 0} onClick={() => setConfirming(true)} className={`${adminButton.primary} disabled:opacity-50`}>
            <CheckIcon className="size-4" />
            Approuver et publier
          </button>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-line/70 bg-white p-5 sm:p-6">
          <h2 className="font-display text-[17px] font-semibold text-ink">{section.title}</h2>
          {section.description ? <p className="mt-1 text-[13px] text-muted">{section.description}</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <Field key={field} field={field} check={check}>
                {field === "legalForm" ? (
                  <select {...input(field)} className={`${adminInput} h-10`}>
                    <option value="">Choisir…</option>
                    {legalForms.map((form) => (
                      <option key={form}>{form}</option>
                    ))}
                  </select>
                ) : legalFields[field].multiline ? (
                  <textarea {...input(field)} rows={field === "dataHost" ? 2 : 5} className={`${adminInput} py-2 leading-[1.55]`} />
                ) : (
                  <input {...input(field)} className={`${adminInput} h-10`} />
                )}
              </Field>
            ))}
            {section.title === "L’exploitation" ? (
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[13px] font-medium text-ink">TVA</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-body">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="vatMode" value="franchise" defaultChecked={initial.vatMode === "franchise"} className="accent-honey" />
                    Non applicable (article 293 B du CGI)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="vatMode" value="assujetti" defaultChecked={initial.vatMode === "assujetti"} className="accent-honey" />
                    Assujetti à la TVA
                  </label>
                </div>
                <p className="mt-1 text-[12px] text-muted">Régime agricole particulier : à vérifier avec votre comptable.</p>
                {config.vatMode === "assujetti" ? (
                  <div className="mt-3 max-w-[320px]">
                    <Field field="vatNumber" check={check}>
                      <input {...input("vatNumber")} className={`${adminInput} h-10`} />
                    </Field>
                  </div>
                ) : (
                  <input type="hidden" name="vatNumber" value={config.vatNumber} />
                )}
              </fieldset>
            ) : null}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-line/70 bg-white p-5 sm:p-6">
        <h2 className="font-display text-[17px] font-semibold text-ink">Durées de conservation</h2>
        <p className="mt-1 text-[13px] text-muted">
          Affichées dans la politique de confidentialité et appliquées par la purge automatique. Commandes et factures : 10 ans (obligation comptable).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(Object.keys(retentionFields) as (keyof typeof retentionFields)[]).map((field) => (
            <label key={field} className="block text-[13px] font-medium text-ink">
              {retentionFields[field].label}
              <span className="mt-1.5 flex items-center gap-2">
                <input
                  name={field}
                  type="number"
                  min={retentionFields[field].min}
                  max={retentionFields[field].max}
                  defaultValue={initial[field]}
                  className={`${adminInput} h-10 w-24`}
                />
                <span className="font-normal text-muted">{retentionFields[field].unit}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <span className="text-muted">Aperçu du brouillon enregistré :</span>
        {[
          ["mentions-legales", "Mentions légales"],
          ["cgv", "CGV"],
          ["confidentialite", "Confidentialité"],
        ].map(([key, label]) => (
          <Link key={key} href={`/admin/informations-legales/apercu/${key}`} className="inline-flex items-center gap-1 font-medium text-honey-dark hover:underline">
            <EyeIcon className="size-3.5" />
            {label}
          </Link>
        ))}
      </p>

      <dialog
        ref={dialogRef}
        aria-label="Approuver et publier"
        onCancel={(event) => {
          event.preventDefault();
          setConfirming(false);
        }}
        className="m-auto w-[min(520px,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(61_43_26/0.45)] backdrop:bg-espresso/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <h2 className="font-display text-[19px] font-semibold">Publier ces informations légales ?</h2>
          <p className="mt-2 text-[14px] leading-[1.55] text-body">
            Les mentions légales, les CGV et la politique de confidentialité seront publiées sur le site, avec un numéro de version. Les commandes
            demanderont d’accepter ces CGV.
          </p>
          <label className="mt-4 flex items-start gap-2.5 rounded-xl bg-cream/70 p-3.5 text-[13.5px] leading-[1.5] text-body">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-honey" />
            J’ai vérifié ces informations. Je sais que ces textes ne remplacent pas un conseil juridique et qu’ils doivent être relus.
          </label>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirming(false)} className={adminButton.secondary} autoFocus>
              Annuler
            </button>
            <button
              type="button"
              disabled={!checked || pending}
              onClick={() => {
                if (!formRef.current) return;
                setConfirming(false);
                setChecked(false);
                setDirty(false);
                run(approveLegalAction, { ...fields(formRef.current), confirm: "on" });
              }}
              className={`${adminButton.primary} disabled:opacity-50`}
            >
              Publier
            </button>
          </div>
        </div>
      </dialog>
    </form>
  );
}
