"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createManualOrderAction, type OrderFormState } from "@/app/admin/commandes/actions";
import { Spinner } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { formatPrice } from "@/components/catalog/product-display";
import { CheckIcon, SearchIcon } from "@/components/icons";
import type { CustomerChoice } from "@/data/admin/customers";
import { manualSaleSteps, paymentMethods, type ManualSaleStep, type SaleProduct } from "@/lib/orders/admin-lines";
import { parseEurosToCents } from "@/lib/catalog/product-form";
import { Field, FormErrors, FormSection, OrderLinesEditor, invalid, linesSubtotalCents, type EditorLine } from "./order-form-parts";

const initialState: OrderFormState = { status: "idle", message: "", errors: {} };
const labels: Record<string, string> = {
  name: "Nom",
  email: "Email",
  phone: "Téléphone",
  companyName: "Société",
  professionalId: "Identifiant professionnel",
  lines: "Produits",
  addressLine1: "Adresse",
  postalCode: "Code postal",
  city: "Ville",
  deliveryFee: "Frais de livraison",
  requestedDate: "Date",
  note: "Note",
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

type Contact = { name: string; email: string; phone: string; companyName: string; addressLine1: string; postalCode: string; city: string };
const emptyContact: Contact = { name: "", email: "", phone: "", companyName: "", addressLine1: "", postalCode: "", city: "" };

// Vente manuelle (CAHIER §17.4) : marché, vente par téléphone, virement.
// La vente est acceptée d'emblée et le stock décompté ; un client existant
// peut être repris pour pré-remplir ses coordonnées.
export function ManualSaleForm({ products, customers, submissionKey }: { products: SaleProduct[]; customers: CustomerChoice[]; submissionKey: string }) {
  const [state, action, pending] = useActionState(createManualOrderAction, initialState);
  const [contact, setContact] = useState(emptyContact);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [fee, setFee] = useState("");
  const [step, setStep] = useState<ManualSaleStep>("delivered");
  const [paid, setPaid] = useState(true);
  const [notify, setNotify] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);
  const errors = state.errors;

  useEffect(() => {
    if (state.status === "error") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  const matches = useMemo(() => {
    const words = normalize(search).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return customers
      .filter((customer) => {
        const haystack = normalize(`${customer.name} ${customer.email} ${customer.phone ?? ""} ${customer.city ?? ""}`);
        return words.every((word) => haystack.includes(word));
      })
      .slice(0, 6);
  }, [customers, search]);

  const set = (name: keyof Contact) => (event: { target: { value: string } }) => setContact((current) => ({ ...current, [name]: event.target.value }));
  const subtotal = linesSubtotalCents(lines);
  const feeCents = method === "delivery" ? (parseEurosToCents(fee || "0") ?? 0) : 0;
  const hasEmail = /\S+@\S+\.\S+/.test(contact.email);

  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <input type="hidden" name="submissionKey" value={submissionKey} />
      <div className="min-w-0 space-y-5">
        <div ref={topRef} className="scroll-mt-20 empty:hidden">
          {state.status === "error" ? <FormErrors message={state.message} errors={errors} labels={labels} /> : null}
        </div>

        <FormSection id="section-client" title="Client" description="Un client de passage peut rester sans email : la vente n’aura pas de fiche client.">
          {customers.length ? (
            <div className="relative mb-4">
              <label htmlFor="customer-search" className="mb-1.5 block text-[13.5px] font-medium text-ink">
                Reprendre un client existant
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input
                  id="customer-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom, email, téléphone ou ville"
                  autoComplete="off"
                  className={`${adminInput} h-10 pl-9`}
                />
              </div>
              {matches.length ? (
                <ul className="mt-2 divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
                  {matches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setContact({
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone ?? "",
                            companyName: "",
                            addressLine1: customer.addressLine1 ?? "",
                            postalCode: customer.postalCode ?? "",
                            city: customer.city ?? "",
                          });
                          setPicked(customer.id);
                          setSearch("");
                        }}
                        className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 py-2.5 text-left text-[13.5px] transition hover:bg-cream"
                      >
                        <span className="font-medium text-ink">{customer.name}</span>
                        <span className="text-[12.5px] text-muted">
                          {customer.email}
                          {customer.city ? ` · ${customer.city}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : search.trim() ? (
                <p className="mt-2 text-[12.5px] text-muted">Aucun client ne correspond : saisissez ses coordonnées ci-dessous.</p>
              ) : null}
              {picked ? (
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-green-800">
                  <CheckIcon className="size-3.5" /> Coordonnées reprises : la vente sera rattachée à sa fiche.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom *" name="name" error={errors.name}>
              <input id="name" name="name" value={contact.name} onChange={set("name")} maxLength={120} autoComplete="off" className={`${adminInput} h-10`} {...invalid(errors.name, "name")} />
            </Field>
            <Field label="Email" name="email" error={errors.email} hint="Pour lui envoyer le récapitulatif ; la vente est rattachée à sa fiche client.">
              <input
                id="email"
                name="email"
                type="email"
                value={contact.email}
                onChange={(event) => {
                  set("email")(event);
                  setPicked(null);
                }}
                autoComplete="off"
                className={`${adminInput} h-10`}
                {...invalid(errors.email, "email")}
              />
            </Field>
            <Field label="Téléphone" name="phone" error={errors.phone}>
              <input id="phone" name="phone" type="tel" value={contact.phone} onChange={set("phone")} autoComplete="off" className={`${adminInput} h-10`} {...invalid(errors.phone, "phone")} />
            </Field>
            <Field label="Exploitation ou société" name="companyName" error={errors.companyName}>
              <input id="companyName" name="companyName" value={contact.companyName} onChange={set("companyName")} maxLength={120} className={`${adminInput} h-10`} {...invalid(errors.companyName, "companyName")} />
            </Field>
            <Field label="Identifiant professionnel" name="professionalId" error={errors.professionalId} hint="SIRET, numéro de TVA ou numéro d’apiculteur, s’il y a lieu.">
              <input id="professionalId" name="professionalId" maxLength={40} autoComplete="off" className={`${adminInput} h-10`} {...invalid(errors.professionalId, "professionalId")} />
            </Field>
          </div>
        </FormSection>

        <FormSection id="section-produits" title="Produits vendus" description="Le prix suit les paliers de la quantité ; modifiez-le si vous avez accordé un prix particulier.">
          <OrderLinesEditor products={products} lines={lines} onChange={setLines} error={errors.lines} stockWarning="la vente sera refusée tant que le stock ne suffit pas." />
        </FormSection>

        <FormSection id="section-reception" title="Remise ou livraison">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(["pickup", "delivery"] as const).map((value) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-[13.5px] font-medium text-ink transition hover:border-parchment ${method === value ? "border-honey bg-honey/5" : "border-line"}`}>
                <input type="radio" name="deliveryMethod" value={value} checked={method === value} onChange={() => setMethod(value)} className="size-4 accent-honey" />
                {value === "pickup" ? "Sur place (marché, exploitation)" : "Livraison"}
              </label>
            ))}
          </div>
          {method === "delivery" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Adresse *" name="addressLine1" error={errors.addressLine1}>
                  <input id="addressLine1" name="addressLine1" value={contact.addressLine1} onChange={set("addressLine1")} className={`${adminInput} h-10`} {...invalid(errors.addressLine1, "addressLine1")} />
                </Field>
              </div>
              <Field label="Code postal *" name="postalCode" error={errors.postalCode}>
                <input id="postalCode" name="postalCode" inputMode="numeric" value={contact.postalCode} onChange={set("postalCode")} className={`${adminInput} h-10`} {...invalid(errors.postalCode, "postalCode")} />
              </Field>
              <Field label="Ville *" name="city" error={errors.city}>
                <input id="city" name="city" value={contact.city} onChange={set("city")} className={`${adminInput} h-10`} {...invalid(errors.city, "city")} />
              </Field>
              <Field label="Frais de livraison (€)" name="deliveryFee" error={errors.deliveryFee} hint="Vide : livraison à convenir.">
                <input id="deliveryFee" name="deliveryFee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="à convenir" className={`${adminInput} h-10`} {...invalid(errors.deliveryFee, "deliveryFee")} />
              </Field>
            </div>
          ) : null}

          <fieldset className="mt-5">
            <legend className="mb-2 text-[13.5px] font-medium text-ink">Où en est la vente ?</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {(Object.keys(manualSaleSteps) as ManualSaleStep[]).map((value) => (
                <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-[13.5px] text-ink transition hover:border-parchment ${step === value ? "border-honey bg-honey/5" : "border-line"}`}>
                  <input type="radio" name="step" value={value} checked={step === value} onChange={() => setStep(value)} className="size-4 accent-honey" />
                  {value === "ready" && method === "delivery" ? "Prête, à livrer" : manualSaleSteps[value]}
                </label>
              ))}
            </div>
          </fieldset>
          {step !== "delivered" ? (
            <div className="mt-4 sm:max-w-[280px]">
              <Field label={method === "delivery" ? "Date de livraison prévue" : "Date de retrait prévue"} name="requestedDate" error={errors.requestedDate} hint="Facultative.">
                <input id="requestedDate" name="requestedDate" type="date" className={`${adminInput} h-10`} {...invalid(errors.requestedDate, "requestedDate")} />
              </Field>
            </div>
          ) : null}
        </FormSection>

        <FormSection id="section-note" title="Note interne" description="Jamais visible par le client : lieu de vente, arrangement particulier…">
          <Field label="Note" name="note" error={errors.note}>
            <textarea id="note" name="note" rows={3} maxLength={2000} placeholder="Ex. marché de Bayeux, samedi matin" className={`${adminInput} py-2.5`} {...invalid(errors.note, "note")} />
          </Field>
        </FormSection>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <section className="space-y-3 rounded-2xl border border-line/70 bg-white p-5 text-[14px]">
          <h2 className="font-display text-[17px] font-semibold text-ink">Récapitulatif</h2>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-4 text-body">
              <dt>Produits</dt>
              <dd className="tabular-nums">{formatPrice(subtotal / 100)}</dd>
            </div>
            {method === "delivery" ? (
              <div className="flex justify-between gap-4 text-body">
                <dt>Livraison</dt>
                <dd className="tabular-nums">{feeCents ? formatPrice(feeCents / 100) : "à convenir"}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-line/60 pt-2 text-[16px] font-semibold text-ink">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice((subtotal + feeCents) / 100)}</dd>
            </div>
          </dl>
          <div className="space-y-2.5 border-t border-line/60 pt-3">
            <label className="flex items-center gap-2.5 text-[13.5px] font-medium text-ink">
              <input type="checkbox" name="paid" checked={paid} onChange={(event) => setPaid(event.target.checked)} className="size-4 rounded border-line accent-honey" />
              Déjà payée
            </label>
            {paid ? (
              <div>
                <label htmlFor="paymentMethod" className="sr-only">
                  Moyen de paiement
                </label>
                <select id="paymentMethod" name="paymentMethod" defaultValue="Espèces" className={`${adminInput} h-10`}>
                  {paymentMethods.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          {hasEmail ? (
            <label className="flex items-start gap-2.5 border-t border-line/60 pt-3 text-[13px] text-ink">
              <input type="checkbox" name="notify" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="mt-0.5 size-4 rounded border-line accent-honey" />
              <span>
                Envoyer le récapitulatif au client
                <span className="block text-[12px] text-muted">Il ne remplace pas une facture.</span>
              </span>
            </label>
          ) : null}
          <button type="submit" disabled={pending || lines.length === 0} className={`${adminButton.primary} w-full`}>
            {pending ? <Spinner /> : <CheckIcon className="size-4" />}
            Enregistrer la vente
          </button>
          <p className="text-[12px] leading-[1.45] text-muted">Le stock des produits vendus en vente directe est décompté à l’enregistrement.</p>
          <Link href="/admin/commandes" className={`${adminButton.ghost} w-full`}>
            Annuler
          </Link>
        </section>
      </aside>
    </form>
  );
}
