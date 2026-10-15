"use client";

import "./globals.css";

// Dernier recours : erreur dans le gabarit racine lui-même (remplace la page
// anglaise par défaut de Next.js). Doit fournir ses propres <html> et <body>.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center text-ink">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-honey uppercase">Erreur</p>
        <h1 className="mt-3 text-[28px] leading-[1.24] font-medium">Le site n’a pas pu s’afficher</h1>
        <p className="mt-3 max-w-[460px] text-[14px] leading-[1.6] text-muted">
          Un problème momentané est survenu. Réessayez dans un instant.
          {error.digest ? <span className="mt-2 block text-[12px]">Référence de l’erreur : {error.digest}</span> : null}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-12 items-center rounded-lg bg-honey px-[22px] text-[15px] font-semibold text-white"
          >
            Réessayer
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- le routeur peut être indisponible ici */}
          <a href="/" className="inline-flex min-h-12 items-center rounded-lg border border-line px-[22px] text-[15px] font-medium">
            Revenir à l’accueil
          </a>
        </div>
      </body>
    </html>
  );
}
