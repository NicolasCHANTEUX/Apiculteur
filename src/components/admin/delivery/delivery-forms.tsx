"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { deleteZoneAction, saveOriginAction, savePickupAction, saveThresholdsAction, saveZoneAction } from "@/app/admin/livraison/actions";
import { ActionButton, Spinner, useAdminAction, type AdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { TrashIcon } from "@/components/icons";
import { pickupModes, type DeliverySettings } from "@/lib/delivery/settings";
import type { DeliveryZone } from "@/lib/delivery/rules";

/** Envoie les champs d'un formulaire à une action serveur. */
function useFormAction(action: AdminAction) {
  const { run, pending } = useAdminAction();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields: Record<string, string> = {};
    for (const [name, value] of new FormData(event.currentTarget).entries()) if (typeof value === "string") fields[name] = value;
    run(action, fields);
  };
  return { onSubmit, pending };
}

function Label({ text, hint, children, className = "" }: { text: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-[13px] font-medium text-ink ${className}`}>
      {text}
      <span className="mt-1.5 block font-normal">{children}</span>
      {hint ? <span className="mt-1 block text-[12px] font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

function Save({ pending, children = "Enregistrer" }: { pending: boolean; children?: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className={adminButton.secondary}>
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function OriginForm({ origin }: { origin: DeliverySettings["origin"] }) {
  const { onSubmit, pending } = useFormAction(saveOriginAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_120px_1fr]">
      <Label text="Adresse" className="sm:col-span-3">
        <input name="line1" defaultValue={origin?.line1 ?? ""} maxLength={200} autoComplete="street-address" className={`${adminInput} h-10`} />
      </Label>
      <Label text="Code postal">
        <input name="postalCode" defaultValue={origin?.postalCode ?? ""} maxLength={5} inputMode="numeric" className={`${adminInput} h-10`} />
      </Label>
      <Label text="Commune" className="sm:col-span-2">
        <input name="city" defaultValue={origin?.city ?? ""} maxLength={100} className={`${adminInput} h-10`} />
      </Label>
      <div className="sm:col-span-3">
        <Save pending={pending}>Enregistrer et localiser</Save>
      </div>
    </form>
  );
}

export function PickupForm({ settings }: { settings: DeliverySettings }) {
  const { onSubmit, pending } = useFormAction(savePickupAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="text-[13px] font-medium text-ink">Adresse de retrait</legend>
        <div className="mt-2 space-y-1.5 text-[13.5px] text-body">
          {(Object.keys(pickupModes) as (keyof typeof pickupModes)[]).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input type="radio" name="pickupMode" value={mode} defaultChecked={settings.pickupMode === mode} className="accent-honey" />
              {pickupModes[mode]}
            </label>
          ))}
        </div>
      </fieldset>
      <Label text="Consignes de retrait" hint="Affichées au client avec le retrait, ex. « Sur rendez-vous, plutôt le samedi matin. »">
        <textarea name="pickupInstructions" defaultValue={settings.pickupInstructions} rows={2} maxLength={600} className={`${adminInput} py-2`} />
      </Label>
      <Label text="Transport des essaims" hint="Affiché sur la page Livraison : ruchettes, délais, météo, envoi des reines…">
        <textarea name="transportNote" defaultValue={settings.transportNote} rows={4} maxLength={2000} className={`${adminInput} py-2`} />
      </Label>
      <Save pending={pending} />
    </form>
  );
}

export function ThresholdsForm({ autoKm, manualKm, quantity }: { autoKm: number; manualKm: number; quantity: number }) {
  const { onSubmit, pending } = useFormAction(saveThresholdsAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Label text="Livraison éloignée au-delà de" hint="km à vol d’oiseau">
          <input name="autoKm" type="number" min={1} max={5000} defaultValue={autoKm} className={`${adminInput} h-10`} />
        </Label>
        <Label text="Très longue distance au-delà de" hint="km à vol d’oiseau">
          <input name="manualKm" type="number" min={1} max={5000} defaultValue={manualKm} className={`${adminInput} h-10`} />
        </Label>
        <Label text="Grande quantité à partir de" hint="unités dans la demande">
          <input name="quantity" type="number" min={1} max={5000} defaultValue={quantity} className={`${adminInput} h-10`} />
        </Label>
      </div>
      <Save pending={pending} />
    </form>
  );
}

const euros = (cents: number) => (cents ? (cents / 100).toFixed(2).replace(".", ",") : "");

/** Une zone de livraison (création si `zone` est absent). */
export function ZoneForm({ zone, onDone }: { zone?: DeliveryZone; onDone?: () => void }) {
  const { run, pending } = useAdminAction();
  const [active, setActive] = useState(zone?.active ?? false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const fields: Record<string, string> = {};
        for (const [name, value] of new FormData(event.currentTarget).entries()) if (typeof value === "string") fields[name] = value;
        run(saveZoneAction, { ...fields, active: String(active) });
        onDone?.();
      }}
      className="space-y-4"
    >
      {zone ? <input type="hidden" name="id" value={zone.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Nom de la zone">
          <input name="name" defaultValue={zone?.name ?? ""} maxLength={80} required className={`${adminInput} h-10`} />
        </Label>
        <Label text="Pays (codes ISO)" hint="FR pour la France.">
          <input name="countries" defaultValue={(zone?.countries ?? ["FR"]).join(", ")} maxLength={80} className={`${adminInput} h-10`} />
        </Label>
        <Label text="Codes postaux inclus" hint="Débuts de codes postaux, ex. « 14, 50, 61 ». Vide : tout le pays.">
          <input name="includePrefixes" defaultValue={zone?.includePrefixes.join(", ") ?? ""} maxLength={400} className={`${adminInput} h-10`} />
        </Label>
        <Label text="Codes postaux exclus" hint="Ex. « 20, 97, 98 » pour la Corse et l’outre-mer.">
          <input name="excludePrefixes" defaultValue={zone?.excludePrefixes.join(", ") ?? ""} maxLength={400} className={`${adminInput} h-10`} />
        </Label>
        <Label text="Tarif TTC (€)" hint="Forfait pour la première unité.">
          <input name="fee" defaultValue={euros(zone?.feeCents ?? 0)} inputMode="decimal" placeholder="0,00" className={`${adminInput} h-10`} />
        </Label>
        <Label text="Par unité supplémentaire (€)" hint="0 : forfait unique.">
          <input name="extraUnitFee" defaultValue={euros(zone?.extraUnitFeeCents ?? 0)} inputMode="decimal" placeholder="0,00" className={`${adminInput} h-10`} />
        </Label>
        <Label text="Distance maximale (km)" hint="Depuis l’exploitation, à vol d’oiseau. Vide : sans limite.">
          <input name="maxDistanceKm" type="number" min={1} max={2000} defaultValue={zone?.maxDistanceKm ?? ""} className={`${adminInput} h-10`} />
        </Label>
        <div className="flex items-end">
          <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-honey" />
            Zone active
            <span className="text-[12px] text-muted">(tarif obligatoire)</span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Save pending={pending}>{zone ? "Enregistrer la zone" : "Créer la zone"}</Save>
        {zone ? (
          <ActionButton
            action={deleteZoneAction}
            fields={{ id: zone.id }}
            className={`${adminButton.ghost} text-muted hover:text-red-700`}
            confirm={{ title: `Supprimer la zone « ${zone.name} » ?`, description: "Les commandes passées gardent leurs frais.", confirmLabel: "Supprimer", tone: "danger" }}
          >
            <TrashIcon className="size-4" />
            Supprimer
          </ActionButton>
        ) : null}
      </div>
    </form>
  );
}

export function NewZone() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={adminButton.secondary}>
        Ajouter une zone
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-parchment p-4">
      <p className="mb-3 font-medium text-ink">Nouvelle zone</p>
      <ZoneForm onDone={() => setOpen(false)} />
    </div>
  );
}
