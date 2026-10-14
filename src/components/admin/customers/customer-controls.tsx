"use client";

import { useState } from "react";
import { forgetCustomerAction, purgeNowAction, updateCustomerAction } from "@/app/admin/clients/actions";
import { ActionButton, Spinner, useAdminAction } from "@/components/admin/action-button";
import { adminButton, adminInput } from "@/components/admin/admin-ui";
import { TrashIcon } from "@/components/icons";

export function CustomerEditForm({ id, name, phone, note }: { id: string; name: string; phone: string; note: string }) {
  const { run, pending } = useAdminAction();
  const [values, setValues] = useState({ name, phone, note });
  const changed = values.name !== name || values.phone !== phone || values.note !== note;
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(updateCustomerAction, { id, ...values });
      }}
      className="space-y-3.5"
    >
      <label className="block text-[13px] font-medium text-ink">
        Nom
        <input value={values.name} onChange={set("name")} maxLength={120} className={`${adminInput} mt-1.5 h-10 font-normal`} />
      </label>
      <label className="block text-[13px] font-medium text-ink">
        Téléphone
        <input value={values.phone} onChange={set("phone")} maxLength={30} type="tel" className={`${adminInput} mt-1.5 h-10 font-normal`} />
      </label>
      <label className="block text-[13px] font-medium text-ink">
        Note interne <span className="font-normal text-muted">(jamais visible par le client)</span>
        <textarea value={values.note} onChange={set("note")} rows={3} maxLength={4000} className={`${adminInput} mt-1.5 py-2 font-normal`} />
      </label>
      {changed ? (
        <button type="submit" disabled={pending} className={adminButton.small}>
          {pending ? <Spinner className="size-3.5" /> : null}
          Enregistrer
        </button>
      ) : null}
    </form>
  );
}

/** Droit à l'effacement : suppression sans commande, anonymisation sinon. */
export function ForgetCustomerButton({ id, name, orders }: { id: string; name: string; orders: number }) {
  return (
    <ActionButton
      action={forgetCustomerAction}
      fields={{ id }}
      className={adminButton.danger}
      confirm={{
        title: orders ? `Anonymiser ${name} ?` : `Supprimer ${name} ?`,
        description: orders
          ? `Ses ${orders} commande${orders > 1 ? "s restent" : " reste"} pour la comptabilité, mais son nom, ses coordonnées, ses adresses et ses messages seront effacés. Ses demandes de contact (avec leurs photos) et les emails qui lui ont été envoyés seront supprimés ; ses avis s’afficheront sous « Client vérifié ». C’est définitif.`
          : "Sa fiche, ses demandes de contact (avec leurs photos) et les emails qui lui ont été envoyés seront supprimés. C’est définitif.",
        confirmLabel: orders ? "Anonymiser définitivement" : "Supprimer définitivement",
        tone: "danger",
      }}
    >
      <TrashIcon className="size-4" />
      {orders ? "Anonymiser le client…" : "Supprimer le client…"}
    </ActionButton>
  );
}

export function PurgeNowButton({ total }: { total: number }) {
  return (
    <ActionButton
      action={purgeNowAction}
      fields={{}}
      className={`${adminButton.secondary} disabled:opacity-60`}
      confirm={{
        title: "Supprimer les données anciennes ?",
        description: `${total} élément${total > 1 ? "s ont" : " a"} dépassé leur durée de conservation. Ils seront supprimés définitivement (la tâche quotidienne le fait aussi chaque matin).`,
        confirmLabel: "Supprimer",
        tone: "danger",
      }}
    >
      Purger maintenant
    </ActionButton>
  );
}
