"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { proposeOrderAction, type OrderFormState } from "@/app/admin/commandes/actions";
import { Spinner } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { formatPrice } from "@/components/catalog/product-display";
import { MapPinIcon, SendIcon, TruckIcon } from "@/components/icons";
import { centsToInput, type SaleProduct } from "@/lib/orders/admin-lines";
import { parseEurosToCents } from "@/lib/catalog/product-form";
import { Field, FormErrors, FormSection, OrderLinesEditor, invalid, linesSubtotalCents, type EditorLine } from "./order-form-parts";

const initialState: OrderFormState = { status: "idle", message: "", errors: {} };
const labels: Record<string, string> = {
  lines: "Produits",
  deliveryMethod: "Réception",
  deliveryFee: "Frais de livraison",
  requestedDate: "Date",
  message: "Message",
};

export type ProposalOrder = {
  id: string;
  version: string;
  number: string;
  customerName: string;
  /** Le client a un email : il peut recevoir un lien de réponse. */
  hasEmail: boolean;
  canDeliver: boolean;
  address: string | null;
  deliveryMethod: "pickup" | "delivery";
  requestedDate: string | null;
  deliveryFee: number;
  total: number;
  lines: EditorLine[];
};

// Proposition de modification d'une demande (CAHIER §8.2) : l'apiculteur
// ajuste produits, quantités, prix, réception et date, avec un message. Le
// client accepte ou décline par un lien ; sans email, l'apiculteur applique
// la proposition après un accord par téléphone.
export function ProposalForm({ order, products, autoEmail, linkDays }: { order: ProposalOrder; products: SaleProduct[]; autoEmail: boolean; linkDays: number }) {
  const [state, action, pending] = useActionState(proposeOrderAction, initialState);
  const [lines, setLines] = useState(order.lines);
  const [method, setMethod] = useState(order.deliveryMethod);
  const [fee, setFee] = useState(order.deliveryFee ? centsToInput(Math.round(order.deliveryFee * 100)) : "");
  const [date, setDate] = useState(order.requestedDate ?? "");
  const [notify, setNotify] = useState(order.hasEmail);
  const topRef = useRef<HTMLDivElement>(null);
  const errors = state.errors;

  useEffect(() => {
    if (state.status === "error") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  const subtotal = linesSubtotalCents(lines);
  const feeCents = method === "delivery" ? (parseEurosToCents(fee || "0") ?? 0) : 0;
  const total = subtotal + feeCents;
  const unchanged =
    method === order.deliveryMethod &&
    date === (order.requestedDate ?? "") &&
    feeCents === Math.round((method === "delivery" ? order.deliveryFee : 0) * 100) &&
    lines.length === order.lines.length &&
    lines.every((line, index) => line.productId === order.lines[index].productId && line.quantity === order.lines[index].quantity && line.unitPrice === order.lines[index].unitPrice);
  const sending = order.hasEmail && notify;

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
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="version" value={order.version} />
      <div className="min-w-0 space-y-5">
        <div ref={topRef} className="scroll-mt-20 empty:hidden">
          {state.status === "error" ? <FormErrors message={state.message} errors={errors} labels={labels} /> : null}
        </div>

        <FormSection id="section-produits" title="Produits" description="Modifiez les quantités ou les prix, retirez un produit ou proposez-en un autre.">
          <OrderLinesEditor
            products={products}
            lines={lines}
            onChange={setLines}
            error={errors.lines}
            stockWarning="si le client accepte, la commande restera à valider tant que le stock ne suffit pas."
          />
        </FormSection>

        <FormSection id="section-reception" title="Retrait ou livraison">
          <fieldset id="deliveryMethod" className="grid gap-2.5 sm:grid-cols-2" aria-describedby={errors.deliveryMethod ? "deliveryMethod-error" : undefined}>
            <legend className="sr-only">Mode de réception</legend>
            {(["pickup", "delivery"] as const).map((value) => {
              const disabled = value === "delivery" && !order.canDeliver;
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-[13.5px] transition ${
                    method === value ? "border-honey bg-honey/5" : "border-line"
                  } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-parchment"}`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value={value}
                    checked={method === value}
                    disabled={disabled}
                    onChange={() => setMethod(value)}
                    className="mt-0.5 size-4 accent-honey"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      {value === "pickup" ? <MapPinIcon className="size-4 text-honey" /> : <TruckIcon className="size-4 text-honey" />}
                      {value === "pickup" ? "Retrait sur l’exploitation" : "Livraison"}
                    </span>
                    <span className="mt-0.5 block text-muted">
                      {value === "pickup" ? "Gratuit, sur rendez-vous." : disabled ? "Pas d’adresse dans la demande." : order.address}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          {errors.deliveryMethod ? (
            <p id="deliveryMethod-error" className="mt-1.5 text-[12.5px] font-medium text-red-700">
              {errors.deliveryMethod}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {method === "delivery" ? (
              <Field label="Frais de livraison (€)" name="deliveryFee" error={errors.deliveryFee} hint="Vide : livraison à convenir.">
                <input id="deliveryFee" name="deliveryFee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="à convenir" className={`${adminInput} h-10`} {...invalid(errors.deliveryFee, "deliveryFee")} />
              </Field>
            ) : null}
            <Field label="Date proposée" name="requestedDate" error={errors.requestedDate} hint="Facultative : laissez vide pour la convenir ensemble.">
              <input id="requestedDate" name="requestedDate" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${adminInput} h-10`} {...invalid(errors.requestedDate, "requestedDate")} />
            </Field>
          </div>
        </FormSection>

        <FormSection id="section-message" title={`Message à ${order.customerName}`} description="Expliquez la proposition : il est repris dans l’email et sur la page de réponse.">
          <Field label="Message" name="message" error={errors.message}>
            <textarea
              id="message"
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="Ex. je n’ai plus que 6 Buckfast pour avril ; je vous propose de compléter avec 2 Carnica, au même prix."
              className={`${adminInput} py-2.5`}
              {...invalid(errors.message, "message")}
            />
          </Field>
        </FormSection>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <section className="space-y-3 rounded-2xl border border-line/70 bg-white p-5 text-[14px]">
          <h2 className="font-display text-[17px] font-semibold text-ink">Récapitulatif</h2>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-4 text-muted">
              <dt>Demande actuelle</dt>
              <dd className="tabular-nums line-through decoration-muted/60">{formatPrice(order.total)}</dd>
            </div>
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
              <dt>Proposition</dt>
              <dd className="tabular-nums">{formatPrice(total / 100)}</dd>
            </div>
          </dl>
          {unchanged ? <p className="text-[12.5px] text-orange-800">Rien n’a changé par rapport à la demande.</p> : null}
          {order.hasEmail ? (
            <label className="flex items-start gap-2.5 border-t border-line/60 pt-3 text-[13px] text-ink">
              <input type="checkbox" name="notify" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="mt-0.5 size-4 rounded border-line accent-honey" />
              <span>
                Envoyer la proposition au client
                <span className="block text-[12px] text-muted">
                  {autoEmail ? "Par email" : "Email préparé dans la rubrique Emails"}, avec un lien pour accepter ou décliner, valable {linkDays} jours.
                </span>
              </span>
            </label>
          ) : (
            <p className="border-t border-line/60 pt-3 text-[12.5px] text-muted">Le client n’a pas d’email : présentez-lui la proposition par téléphone, puis appliquez-la depuis la commande.</p>
          )}
          {!sending && order.hasEmail ? <p className="text-[12.5px] text-muted">Sans envoi, vous appliquerez la proposition vous-même une fois l’accord obtenu.</p> : null}
          <button type="submit" disabled={pending || lines.length === 0} className={`${adminButton.primary} w-full`}>
            {pending ? <Spinner /> : <SendIcon className="size-4" />}
            {sending ? "Envoyer la proposition" : "Enregistrer la proposition"}
          </button>
          <Link href={`/admin/commandes/${order.id}`} className={`${adminButton.ghost} w-full`}>
            Annuler
          </Link>
        </section>
      </aside>
    </form>
  );
}
