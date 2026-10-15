import { formatPrice } from "@/components/catalog/product-display";
import { MapPinIcon, TruckIcon } from "@/components/icons";
import type { ProposalTerms } from "@/data/order-proposals";

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Lignes, réception, date et total d'une demande ou d'une proposition. */
export function ProposalTermsCard({ title, terms, highlight = false }: { title: string; terms: ProposalTerms; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-[13.5px] ${highlight ? "border-honey/50 bg-honey/5" : "border-line/80 bg-cream/40"}`}>
      <p className="text-[11.5px] font-medium tracking-[0.06em] text-muted uppercase">{title}</p>
      <ul className="mt-2 space-y-1">
        {terms.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-3">
            <span className="min-w-0 text-ink">
              {line.quantity} × {line.name}
            </span>
            <span className="shrink-0 text-body tabular-nums">{line.lineTotal > 0 ? formatPrice(line.lineTotal) : "à confirmer"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 flex items-center gap-1.5 text-body">
        {terms.deliveryMethod === "delivery" ? <TruckIcon className="size-3.5 text-honey" /> : <MapPinIcon className="size-3.5 text-honey" />}
        {terms.deliveryMethod === "delivery" ? `Livraison${terms.deliveryFee > 0 ? ` (${formatPrice(terms.deliveryFee)})` : ", frais à convenir"}` : "Retrait sur l’exploitation"}
        {terms.requestedDate ? ` · ${day.format(new Date(`${terms.requestedDate}T12:00:00Z`))}` : ""}
      </p>
      <p className="mt-2 flex justify-between gap-3 border-t border-line/60 pt-2 font-semibold text-ink">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(terms.total)}</span>
      </p>
    </div>
  );
}
