"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { submitReviewAction, type ReviewFormState } from "@/app/(site)/mon-avis/actions";
import { AlertTriangleIcon, ArrowRightIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";
import { MAX_REVIEW_COMMENT } from "@/lib/reviews/form";

const initialState: ReviewFormState = { status: "idle", message: "", errors: {} };
const ratingWords = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

// Formulaire de dépôt d'avis (lien personnel). Note obligatoire ; publication
// seulement avec l'accord explicite du client, sous le nom qu'il choisit.
export function ReviewForm({ token, suggestedName }: { token: string; suggestedName: string }) {
  const [state, action, pending] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [length, setLength] = useState(0);
  const shown = hovered || rating;
  const errors = state.errors;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("token", token);
        startTransition(() => action(formData));
      }}
      className="space-y-6 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-7"
    >
      {state.status === "error" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="font-medium">{state.message}</p>
        </div>
      ) : null}

      <fieldset aria-describedby={errors.rating ? "rating-error" : undefined}>
        <legend className="text-[15px] font-medium text-ink">Votre note</legend>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer p-1" onMouseEnter={() => setHovered(value)}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="peer sr-only"
                />
                <span className="sr-only">
                  {value} étoile{value > 1 ? "s" : ""} sur 5
                </span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className={`size-10 rounded-md transition peer-focus-visible:ring-2 peer-focus-visible:ring-honey/50 motion-safe:hover:scale-110 ${
                    value <= shown ? "fill-honey text-honey" : "fill-transparent text-parchment"
                  }`}
                >
                  <path
                    d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
            ))}
          </div>
          <p className="min-w-[90px] text-[14px] font-medium text-honey-dark" aria-live="polite">
            {shown ? ratingWords[shown] : ""}
          </p>
        </div>
        {errors.rating ? (
          <p id="rating-error" className="mt-1.5 text-[12.5px] font-medium text-red-700">
            {errors.rating}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor="comment" className="mb-1.5 block text-[14px] font-medium text-ink">
          Votre avis <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={6}
          maxLength={MAX_REVIEW_COMMENT}
          onChange={(event) => setLength(event.target.value.length)}
          placeholder="L’installation, le comportement des abeilles, l’accueil, les conseils…"
          aria-invalid={errors.comment ? true : undefined}
          className={`${inputClass} resize-y py-2.5 leading-[1.6]`}
        />
        <p className={`mt-1.5 text-right text-[12px] ${errors.comment ? "font-medium text-red-700" : "text-muted"}`}>
          {errors.comment ?? `${length} / ${MAX_REVIEW_COMMENT}`}
        </p>
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-medium text-ink">
          Nom affiché avec votre avis
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={suggestedName}
          maxLength={40}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby="displayName-hint"
          className={`${inputClass} h-11 sm:max-w-[280px]`}
        />
        <p id="displayName-hint" className={`mt-1.5 text-[12.5px] ${errors.displayName ? "font-medium text-red-700" : "text-muted"}`}>
          {errors.displayName ?? "Votre prénom et l’initiale de votre nom, par exemple. Jamais votre email."}
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-line/80 bg-cream/50 p-4 text-[13.5px] leading-[1.55] text-body">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 rounded border-line accent-honey" />
        <span>
          J’accepte que mon avis soit publié sur le site sous ce nom, après relecture.{" "}
          <span className="text-muted">Sans cette case, il reste privé : seul l’apiculteur le lit.</span>{" "}
          <Link href="/confidentialite" className="font-medium text-honey-dark underline-offset-2 hover:underline">
            Vos données
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-honey text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Envoi en cours…" : "Envoyer mon avis"}
        {pending ? null : <ArrowRightIcon className="size-4" />}
      </button>
    </form>
  );
}
