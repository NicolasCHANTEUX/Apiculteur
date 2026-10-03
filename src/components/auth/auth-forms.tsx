"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import {
  loginAction,
  requestPasswordResetAction,
  updatePasswordAction,
  type AuthFormState,
} from "@/app/(site)/connexion/actions";
import { inputClass } from "@/components/ui";

const initialState: AuthFormState = { status: "idle", message: "" };

export function FormNotice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-line bg-sand text-body",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-[13.5px] leading-[1.55] ${styles}`}
    >
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-lg bg-honey text-[15px] font-medium text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.7)] transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Un instant…" : children}
    </button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <FormNotice tone="error">{state.message}</FormNotice>
      ) : null}
      <input type="hidden" name="redirect" value={redirectTo} />
      <Field id="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={`${inputClass} h-11`}
        />
      </Field>
      <Field id="password" label="Mot de passe">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${inputClass} h-11`}
        />
      </Field>
      <SubmitButton pending={pending}>Se connecter</SubmitButton>
      <p className="text-center text-[13px]">
        <Link href="/mot-de-passe-oublie" className="text-honey hover:text-honey-dark">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormNotice tone="success">{state.message}</FormNotice>
        <p className="text-center text-[13px]">
          <Link href="/connexion" className="text-honey hover:text-honey-dark">
            Retour à la connexion
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <FormNotice tone="error">{state.message}</FormNotice>
      ) : null}
      <Field id="email" label="Email du compte">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={`${inputClass} h-11`}
        />
      </Field>
      <SubmitButton pending={pending}>Recevoir un lien</SubmitButton>
      <p className="text-center text-[13px]">
        <Link href="/connexion" className="text-honey hover:text-honey-dark">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <FormNotice tone="error">{state.message}</FormNotice>
      ) : null}
      <Field id="password" label="Nouveau mot de passe (10 caractères minimum)">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className={`${inputClass} h-11`}
        />
      </Field>
      <Field id="confirmation" label="Confirmez le mot de passe">
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className={`${inputClass} h-11`}
        />
      </Field>
      <SubmitButton pending={pending}>Enregistrer le mot de passe</SubmitButton>
    </form>
  );
}
