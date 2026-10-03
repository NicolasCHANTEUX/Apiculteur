import type { PublicReview } from "@/data/reviews";
import { CircleCheckIcon, MessageSquareIcon } from "@/components/icons";
import { InitialAvatar, OwnerAvatar, Stars } from "@/components/ui";
import { site } from "@/lib/site";

function formatReviewDate(review: PublicReview) {
  const label = new Date(review.submittedAt ?? review.createdAt).toLocaleDateString(
    "fr-FR",
    { month: "long", year: "numeric", timeZone: "Europe/Paris" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "compact" : cartes de la page d'accueil ; "full" : page Avis clients.
export function ReviewCard({
  review,
  productName,
  variant = "compact",
}: {
  review: PublicReview;
  productName?: string;
  variant?: "compact" | "full";
}) {
  const full = variant === "full";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line/50 bg-white text-left shadow-[0_1px_3px_rgb(61_43_26/0.08)]">
      <div className="flex-1 p-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <InitialAvatar name={review.customerName} />
            <div>
              <p className="text-[13px] font-medium text-ink">
                {review.customerName}
              </p>
              <p className="text-[11px] text-muted">{formatReviewDate(review)}</p>
            </div>
          </div>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-sage/20 bg-sage/10 px-2 py-0.5 text-[11px] text-sage">
            <CircleCheckIcon className="size-3" />
            {full ? "Client vérifié" : "Vérifié"}
          </span>
        </div>

        <Stars rating={review.rating} className="mt-4 text-[12.5px]" />

        {review.comment ? (
          <p className="mt-3 text-[13px] leading-[1.65] text-body">
            “{review.comment}”
          </p>
        ) : null}

        {productName ? (
          <p
            className={`mt-3 text-[11px] ${full ? "text-muted" : "text-honey"}`}
          >
            {full ? `Produit : ${productName}` : productName}
          </p>
        ) : null}
      </div>

      {review.adminReply ? (
        <div
          className={`border-t px-[18px] py-4 ${full ? "border-line/60 bg-sand" : "border-line/40 bg-cream"}`}
        >
          <div className="flex items-start gap-2.5">
            {full ? (
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded bg-honey text-white">
                <MessageSquareIcon className="size-3" />
              </span>
            ) : (
              <OwnerAvatar className="size-[26px] text-[11px]" />
            )}
            <div>
              <p className="text-[11px] font-semibold text-brown">
                {full
                  ? "Réponse de l'apiculteur"
                  : `Réponse de ${site.owner.firstName}`}
              </p>
              <p className="mt-1 text-[11px] leading-[1.65] text-body italic">
                “{review.adminReply}”
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
