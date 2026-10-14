"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { submitOrderRequestAction, type OrderRequestState } from "@/app/(site)/commande/actions";
import { AlertTriangleIcon, ArrowRightIcon, CartIcon, CircleCheckIcon, MapPinIcon, TruckIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";
import type { PublicProduct } from "@/data/catalog";
import { cartSnapshot, parseCart, subscribeCart } from "@/lib/cart/storage";
import { formatEuros } from "@/lib/domain/pricing";
import { priceRequest, type DeliveryChoice } from "@/lib/orders/request";

const initialState: OrderRequestState = { status: "idle", message: "", errors: {}, problems: [] };

function Field({
  label,
  name,
  error,
  hint,
  optional = false,
  children,
  className = "",
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-muted"> (facultatif)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.05)] sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-[19px] font-medium text-ink">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-honey font-sans text-[13px] font-semibold text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Formulaire de demande de commande. Le récapitulatif reprend le panier du
// navigateur avec les règles de prix du serveur ; le serveur refait tout à
// l'envoi. Une clé d'envoi unique évite les doublons (double clic).
/**
 * `termsVersion` : version des CGV publiée, à accepter avant l'envoi ;
 * null tant que les informations légales ne sont pas publiées.
 */
export function OrderRequestForm({ products, today, termsVersion }: { products: PublicProduct[]; today: string; termsVersion: number | null }) {
  const cart = parseCart(useSyncExternalStore(subscribeCart, cartSnapshot, () => "[]"));
  const priced = priceRequest(cart, products);
  const [state, action, pending] = useActionState(submitOrderRequestAction, initialState);
  const [delivery, setDelivery] = useState<DeliveryChoice>("pickup");
  const [professional, setProfessional] = useState(false);
  const keyRef = useRef<string | null>(null);
  const errors = state.errors;
  const field = (name: string) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-14 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-honey/12 text-honey">
          <CartIcon className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-[24px] font-medium text-ink">Votre panier est vide</h2>
        <p className="mt-2 max-w-[400px] text-[14px] text-muted">Ajoutez des produits à votre panier pour préparer votre demande.</p>
        <Link href="/catalogue" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-honey px-6 text-[15px] font-semibold text-white transition hover:bg-honey-dark">
          Voir le catalogue
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );
  }

  const problems = state.problems.length ? state.problems : priced.problems;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        keyRef.current ??= crypto.randomUUID();
        const formData = new FormData(event.currentTarget);
        formData.set("submissionKey", keyRef.current);
        formData.set("items", JSON.stringify(cart));
        if (termsVersion) formData.set("termsVersion", String(termsVersion));
        startTransition(() => action(formData));
      }}
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0 space-y-5">
        {state.status === "error" ? (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-[14px] text-red-900">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
            <div>
              <p className="font-medium">{state.message}</p>
              {state.problems.length ? (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px]">
                  {state.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <Step number={1} title="Vos coordonnées">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom et prénom" name="name" error={errors.name} className="sm:col-span-2">
              <input {...field("name")} autoComplete="name" className={`${inputClass} h-11`} />
            </Field>
            <Field label="Email" name="email" error={errors.email}>
              <input {...field("email")} type="email" autoComplete="email" className={`${inputClass} h-11`} />
            </Field>
            <Field label="Téléphone" name="phone" error={errors.phone} hint="Pour convenir du retrait ou de la livraison.">
              <input {...field("phone")} type="tel" autoComplete="tel" className={`${inputClass} h-11`} />
            </Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" checked={professional} onChange={(event) => setProfessional(event.target.checked)} className="size-4 accent-honey" />
            Je commande pour une exploitation ou une entreprise
          </label>
          {professional ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Raison sociale" name="companyName" error={errors.companyName} optional>
                <input {...field("companyName")} autoComplete="organization" className={`${inputClass} h-11`} />
              </Field>
              <Field label="Identifiant professionnel" name="professionalId" error={errors.professionalId} hint="SIRET, numéro d’apiculteur (NAPI)…" optional>
                <input {...field("professionalId")} className={`${inputClass} h-11`} />
              </Field>
            </div>
          ) : null}
        </Step>

        <Step number={2} title="Retrait ou livraison">
          <fieldset>
            <legend className="sr-only">Mode de réception</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { value: "pickup", icon: MapPinIcon, title: "Retrait sur l’exploitation", text: "Sur rendez-vous, convenu ensemble." },
                { value: "delivery", icon: TruckIcon, title: "Livraison à organiser", text: "Conditions et frais confirmés après étude." },
              ] as const).map((option) => {
                const Icon = option.icon;
                const checked = delivery === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                      checked ? "border-honey bg-honey/8 ring-1 ring-honey/40" : "border-line hover:border-honey/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={option.value}
                      checked={checked}
                      onChange={() => setDelivery(option.value)}
                      className="mt-1 size-4 accent-honey"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
                        <Icon className="size-4 text-honey" />
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">{option.text}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {delivery === "delivery" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px_1fr]">
              <Field label="Adresse" name="addressLine1" error={errors.addressLine1} className="sm:col-span-3">
                <input {...field("addressLine1")} autoComplete="street-address" className={`${inputClass} h-11`} />
              </Field>
              <Field label="Code postal" name="postalCode" error={errors.postalCode} className="sm:col-span-1">
                <input {...field("postalCode")} inputMode="numeric" autoComplete="postal-code" className={`${inputClass} h-11`} />
              </Field>
              <Field label="Ville" name="city" error={errors.city} className="sm:col-span-2">
                <input {...field("city")} autoComplete="address-level2" className={`${inputClass} h-11`} />
              </Field>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Date souhaitée" name="requestedDate" error={errors.requestedDate} hint="Indicative : elle sera confirmée ensemble." optional>
              <input {...field("requestedDate")} type="date" min={today} className={`${inputClass} h-11`} />
            </Field>
          </div>
        </Step>

        <Step number={3} title="Votre message">
          <Field label="Précisions" name="message" error={errors.message} hint="Votre projet, votre niveau, des contraintes de date…" optional>
            <textarea {...field("message")} rows={4} maxLength={2000} className={`${inputClass} resize-y py-2.5`} />
          </Field>
          {/* Champ piège pour les robots, invisible pour les visiteurs. */}
          <div className="absolute -left-[9999px]" aria-hidden>
            <label>
              Site web
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]" aria-label="Récapitulatif de la demande">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-28px_rgb(61_43_26/0.5)]">
          <div className="bg-espresso px-6 py-5 text-white">
            <p className="text-[12px] tracking-[0.08em] text-white/60 uppercase">Total estimé</p>
            <p className="mt-1 text-[30px] leading-none font-semibold">{formatEuros(priced.subtotalCents)}</p>
            {priced.lines.some((line) => line.unitPriceCents === null) ? (
              <p className="mt-2 text-[12.5px] text-[#f6d27a]">+ produits au prix à confirmer</p>
            ) : null}
          </div>
          <div className="space-y-4 p-6">
            <ul className="space-y-3">
              {priced.lines.map((line) => (
                <li key={line.product.id} className="flex items-center gap-3 text-[13.5px]">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {line.product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.product.images[0].url} alt="" className="size-full object-cover" />
                    ) : null}
                    <span className="absolute -top-0 -right-0 rounded-bl-md bg-espresso px-1.5 text-[11px] font-semibold text-white">
                      {line.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">{line.product.name}</span>
                  <span className="shrink-0 font-medium text-ink tabular-nums">
                    {line.lineTotalCents === null ? "à confirmer" : formatEuros(line.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/panier" className="block text-[13px] font-medium text-honey-dark hover:underline">
              Modifier le panier
            </Link>

            {problems.length ? (
              <div className="rounded-xl bg-red-50 px-3.5 py-3 text-[13px] text-red-800">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangleIcon className="size-4" /> À corriger dans le panier
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {termsVersion ? (
              <div>
                <label className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-body">
                  <input
                    type="checkbox"
                    name="terms"
                    aria-invalid={errors.terms ? true : undefined}
                    aria-describedby={errors.terms ? "terms-error" : undefined}
                    className="mt-0.5 size-4 shrink-0 rounded border-line accent-honey"
                  />
                  <span>
                    J’ai lu et j’accepte les{" "}
                    <Link href="/cgv" target="_blank" className="font-medium text-honey-dark underline underline-offset-2">
                      conditions générales de vente
                    </Link>
                    .
                  </span>
                </label>
                {errors.terms ? (
                  <p id="terms-error" className="mt-1.5 text-[12.5px] font-medium text-red-700">
                    {errors.terms}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending || priced.problems.length > 0}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-honey text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none"
            >
              {pending ? "Envoi en cours…" : "Envoyer ma demande"}
              {pending ? null : <ArrowRightIcon className="size-4" />}
            </button>

            <ul className="space-y-2 border-t border-sand pt-4 text-[12.5px] text-body">
              {[
                "Aucun paiement à cette étape",
                "Disponibilité confirmée personnellement",
                "Retrait ou livraison convenus ensemble",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <CircleCheckIcon className="mt-px size-4 shrink-0 text-sage" />
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] leading-[1.5] text-muted">
              Vos coordonnées servent uniquement à traiter votre demande.{" "}
              {termsVersion ? (
                <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
                  En savoir plus
                </Link>
              ) : null}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
