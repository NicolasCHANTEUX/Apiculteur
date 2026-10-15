"use client";

import Link from "next/link";
import { logoutAction } from "@/app/(site)/connexion/actions";

// Erreur dans un gabarit (site public ou administration), que les pages
// d'erreur de chaque partie ne peuvent pas attraper. « Se déconnecter »
// permet de sortir d'une session devenue inutilisable.
export default function LayoutError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center px-6 py-20 text-center">
      <p className="text-[13px] font-semibold tracking-[0.08em] text-honey uppercase">Erreur</p>
      <h1 className="mt-3 font-display text-[30px] leading-[1.24] font-medium text-ink">Cette page n’a pas pu s’afficher</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-muted">
        Un problème momentané est survenu. Réessayez dans un instant. Si vous étiez connecté à l’espace apiculteur, une nouvelle
        connexion règle le plus souvent le problème.
        {error.digest ? <span className="mt-2 block text-[12px]">Référence de l’erreur : {error.digest}</span> : null}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center rounded-lg bg-honey px-[22px] text-[15px] font-semibold text-white transition hover:bg-honey-dark"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-lg border border-line px-[22px] text-[15px] font-medium text-ink transition hover:bg-sand"
        >
          Revenir à l’accueil
        </Link>
      </div>
      <form action={logoutAction} className="mt-5">
        <button type="submit" className="text-[13px] text-muted underline-offset-2 transition hover:text-ink hover:underline">
          Se déconnecter et se reconnecter
        </button>
      </form>
    </main>
  );
}
