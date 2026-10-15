"use client";

import { useActionState, useState, useTransition } from "react";
import { logoutAction } from "@/app/(site)/connexion/actions";
import {
  confirmMfaEnrollmentAction,
  startMfaEnrollmentAction,
  verifyMfaAction,
  type MfaEnrollment,
  type MfaFormState,
} from "@/app/(site)/connexion/mfa-actions";
import { FormNotice } from "@/components/auth/auth-forms";
import { inputClass } from "@/components/ui";
import { formatTotpSecret } from "@/lib/auth/mfa";
import { site } from "@/lib/site";

const initialState: MfaFormState = { status: "idle", message: "" };
const button =
  "flex min-h-12 w-full items-center justify-center rounded-lg bg-honey text-[15px] font-medium text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.7)] transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70";

function CodeField() {
  return (
    <div>
      <label htmlFor="code" className="mb-2 block text-[13px] text-ink">
        Code à 6 chiffres
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        required
        autoFocus
        aria-describedby="code-hint"
        className={`${inputClass} h-12 text-center font-mono text-[22px] tracking-[0.35em]`}
      />
      <p id="code-hint" className="mt-2 text-[12.5px] leading-[1.5] text-muted">
        Affiché par l’application d’authentification de votre téléphone, sous « {site.name} ». Il change toutes les 30 secondes : saisissez celui du moment.
      </p>
    </div>
  );
}

/** Étapes de la configuration, visibles avant et pendant l'affichage du QR code. */
function EnrollSteps({ scanning }: { scanning: boolean }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-[1.6] text-body">
      <li>Installez sur votre téléphone une application d’authentification (gratuite) : Google Authenticator, Microsoft Authenticator ou 2FAS.</li>
      <li>
        Dans l’application, appuyez sur « + », puis « Scanner un code QR », et visez {scanning ? "le QR code ci-dessous" : "le QR code qui va s’afficher"}.
      </li>
      <li>Saisissez le code à 6 chiffres que l’application affiche alors sous « {site.name} ».</li>
    </ol>
  );
}

function SignOut() {
  return (
    <form action={logoutAction} className="text-center">
      <button type="submit" className="text-[13px] text-muted transition hover:text-ink">
        Se déconnecter
      </button>
    </form>
  );
}

/** Code de l'application d'authentification, à chaque connexion. */
export function MfaVerifyForm({ target }: { target: string }) {
  const [state, action, pending] = useActionState(verifyMfaAction, initialState);
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5" noValidate>
        {state.status === "error" ? <FormNotice tone="error">{state.message}</FormNotice> : null}
        <input type="hidden" name="redirect" value={target} />
        <CodeField />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Vérification…" : "Valider"}
        </button>
      </form>
      <p className="text-center text-[12.5px] leading-[1.55] text-muted">
        Téléphone perdu ou changé ? La double authentification peut être réinitialisée par la personne qui gère le site
        (commande « mfa-reset »).
      </p>
      <SignOut />
    </div>
  );
}

/** Première connexion : association d'une application, puis premier code. */
export function MfaEnrollForm({ target }: { target: string }) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [starting, startTransition] = useTransition();
  const [state, action, pending] = useActionState(confirmMfaEnrollmentAction, initialState);

  const start = () => startTransition(async () => setEnrollment(await startMfaEnrollmentAction()));

  if (enrollment?.status !== "ready") {
    return (
      <div className="space-y-5">
        {enrollment?.status === "error" ? <FormNotice tone="error">{enrollment.message}</FormNotice> : null}
        <EnrollSteps scanning={false} />
        <button
          type="button"
          disabled={starting}
          onClick={start}
          className={button}
        >
          {starting ? "Préparation…" : "Afficher le QR code"}
        </button>
        <SignOut />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <EnrollSteps scanning />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrCode} alt="QR code à scanner avec l’application d’authentification" width={200} height={200} className="size-[200px]" />
        <p className="text-center text-[12.5px] leading-[1.55] text-muted">
          Impossible de scanner ? Saisissez cette clé dans l’application :
          <span className="mt-1 block font-mono text-[13.5px] font-medium tracking-wide break-all text-ink select-all">
            {formatTotpSecret(enrollment.secret)}
          </span>
          <span className="mt-1 block">(type « basé sur l’heure ») · Ne partagez jamais ce QR code ni cette clé.</span>
        </p>
        <button type="button" onClick={start} disabled={starting} className="text-[12.5px] font-medium text-honey-dark hover:underline disabled:opacity-60">
          {starting ? "Préparation…" : "Générer un autre QR code"}
        </button>
      </div>
      <form action={action} className="space-y-5" noValidate>
        {state.status === "error" ? <FormNotice tone="error">{state.message}</FormNotice> : null}
        <input type="hidden" name="redirect" value={target} />
        <input type="hidden" name="factorId" value={enrollment.factorId} />
        <CodeField />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Vérification…" : "Activer la double authentification"}
        </button>
      </form>
      <SignOut />
    </div>
  );
}
