"use client";

import { startTransition, useActionState, useState } from "react";
import { answerProposalAction, type ProposalAnswerState } from "@/app/(site)/proposition/actions";
import { AlertTriangleIcon, CheckIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";

const initialState: ProposalAnswerState = { status: "idle", message: "" };

// Réponse à une proposition : accepter (la commande est confirmée) ou
// décliner (la demande reste à l'étude), avec un mot facultatif.
export function ProposalAnswer({ token, ownerFirstName }: { token: string; ownerFirstName: string }) {
  const [state, action, pending] = useActionState(answerProposalAction, initialState);
  const [length, setLength] = useState(0);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // Le bouton cliqué (accepter ou décliner) fait partie de la réponse.
        const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
        formData.set("token", token);
        startTransition(() => action(formData));
      }}
      className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-7"
    >
      {state.status === "error" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="font-medium">{state.message}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="reply" className="mb-1.5 block text-[14px] font-medium text-ink">
          Un mot pour {ownerFirstName} <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <textarea
          id="reply"
          name="reply"
          rows={3}
          maxLength={2000}
          onChange={(event) => setLength(event.target.value.length)}
          placeholder="Une précision, une question, une autre date qui vous arrangerait…"
          className={`${inputClass} resize-y py-2.5 leading-[1.6]`}
        />
        <p className="mt-1.5 text-right text-[12px] text-muted">{length} / 2000</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="decision"
          value="accept"
          disabled={pending}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-honey px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70"
        >
          <CheckIcon className="size-4" />
          {pending ? "Envoi en cours…" : "J’accepte la proposition"}
        </button>
        <button
          type="submit"
          name="decision"
          value="decline"
          disabled={pending}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-[15px] font-medium text-ink transition hover:border-parchment hover:bg-cream disabled:cursor-wait disabled:opacity-70"
        >
          Je décline
        </button>
      </div>
      <p className="text-center text-[12.5px] leading-[1.55] text-muted">
        En acceptant, votre commande est confirmée selon la proposition. En déclinant, votre demande reste à l’étude : {ownerFirstName} revient vers vous.
        Aucun paiement n’est demandé en ligne.
      </p>
    </form>
  );
}
