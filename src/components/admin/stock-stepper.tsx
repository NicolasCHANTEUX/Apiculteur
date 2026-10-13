"use client";

import { useOptimistic, useState, useTransition } from "react";
import { updateStockAction } from "@/app/admin/produits/actions";
import { useToast } from "@/components/admin/toast";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { stockLevel } from "@/lib/admin/product-health";

const MAX_STOCK = 100_000;

const levelStyles = {
  out: { ring: "border-red-200 bg-red-50/60", text: "text-red-700", label: "Rupture" },
  low: { ring: "border-orange-200 bg-orange-50/60", text: "text-orange-700", label: "Stock faible" },
  ok: { ring: "border-line bg-white", text: "text-ink", label: null },
} as const;

// Ajustement du stock depuis la liste : −1, +1 ou saisie directe. La valeur
// change immédiatement à l'écran ; une erreur du serveur la rétablit.
export function StockStepper({
  id,
  name,
  stock,
  threshold,
  purchaseMode,
}: {
  id: string;
  name: string;
  stock: number;
  threshold: number | null;
  purchaseMode: string;
}) {
  const [value, setOptimistic] = useOptimistic(stock);
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const style = levelStyles[stockLevel(value, threshold, purchaseMode)];

  function commit(next: number) {
    if (!Number.isInteger(next) || next < 0 || next > MAX_STOCK || next === value) return;
    startTransition(async () => {
      setOptimistic(next);
      const formData = new FormData();
      formData.set("id", id);
      formData.set("stockQuantity", String(next));
      const result = await updateStockAction(formData);
      if (result.status === "error") toast.show("error", result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className={`inline-flex h-9 items-center rounded-lg border ${style.ring}`}>
        <button
          type="button"
          onClick={() => commit(value - 1)}
          disabled={value <= 0}
          aria-label={`Retirer 1 au stock de ${name}`}
          className="flex h-full w-8 items-center justify-center rounded-l-lg text-body transition hover:bg-sand disabled:opacity-40"
        >
          <MinusIcon className="size-3.5" />
        </button>
        <input
          value={draft ?? String(value)}
          inputMode="numeric"
          aria-label={`Stock de ${name}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => {
            if (draft !== null && draft !== "") commit(Number(draft));
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          className={`h-full w-12 border-x border-inherit bg-transparent text-center text-[16px] font-medium tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-honey/30 sm:text-[14px] ${style.text}`}
        />
        <button
          type="button"
          onClick={() => commit(value + 1)}
          disabled={value >= MAX_STOCK}
          aria-label={`Ajouter 1 au stock de ${name}`}
          className="flex h-full w-8 items-center justify-center rounded-r-lg text-body transition hover:bg-sand disabled:opacity-40"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
      {style.label ? (
        <span className={`text-[11.5px] font-medium ${style.text}`}>
          {style.label}
          {threshold !== null && value > 0 ? ` · seuil ${threshold}` : ""}
        </span>
      ) : null}
    </div>
  );
}
