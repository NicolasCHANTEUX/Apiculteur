import type { Metadata } from "next";
import { formatPrice } from "@/components/catalog/product-display";
import { getDashboardData } from "@/data/admin/dashboard";
import { getLaunchChecks, type LaunchCheck } from "@/data/admin/launch-status";
import { requireAdmin } from "@/data/auth";
import {
  formatOrderDate,
  fulfillmentLabels,
  validationLabels,
} from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Tableau de bord" };

function StatCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-[0_1px_3px_rgb(61_43_26/0.06)] ${
        highlight ? "border-honey/60" : "border-line/70"
      }`}
    >
      <p className="text-[12px] tracking-[0.04em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-[30px] leading-none font-semibold text-ink lining-nums tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[12px] text-muted">{hint}</p>
    </div>
  );
}

const checkStyles: Record<LaunchCheck["state"], { label: string; pill: string }> = {
  ok: { label: "OK", pill: "border-green-200 bg-green-50 text-green-700" },
  todo: { label: "À configurer", pill: "border-orange-200 bg-orange-50 text-orange-700" },
  later: { label: "À venir", pill: "border-line bg-sand text-muted" },
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line/70 bg-white shadow-[0_1px_3px_rgb(61_43_26/0.06)]">
      <h2 className="border-b border-line/60 px-5 py-3.5 font-display text-[17px] font-semibold text-ink">
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function AdminDashboardPage(props: PageProps<"/admin">) {
  await requireAdmin("/admin");
  const [data, params] = await Promise.all([getDashboardData(), props.searchParams]);
  const checks = getLaunchChecks();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">Tableau de bord</h1>
        <p className="mt-1 text-[14px] text-muted">
          Vue d’ensemble de l’activité et de la mise en service du site.
        </p>
      </div>

      {params["mot-de-passe"] === "modifie" ? (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13.5px] text-green-800">
          Votre mot de passe a été modifié.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Commandes à valider"
          value={data.ordersToValidate}
          hint="Quantité ou livraison à étudier"
          highlight={data.ordersToValidate > 0}
        />
        <StatCard
          label="Commandes à traiter"
          value={data.ordersToProcess}
          hint="À préparer ou en préparation"
          highlight={data.ordersToProcess > 0}
        />
        <StatCard
          label="Avis en attente"
          value={data.reviewsPending}
          hint="À modérer avant publication"
          highlight={data.reviewsPending > 0}
        />
        <StatCard
          label="Produits publiés"
          value={data.products.published}
          hint={`${data.products.total} au total dans le catalogue`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Dernières commandes">
          {data.latestOrders.length === 0 ? (
            <p className="text-[14px] text-muted">Aucune commande pour le moment.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {data.latestOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13.5px]">
                  <div>
                    <p className="font-medium text-ink">
                      {order.orderNumber}
                      {order.customerName ? (
                        <span className="font-normal text-muted"> · {order.customerName}</span>
                      ) : null}
                    </p>
                    <p className="text-[12px] text-muted">{formatOrderDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11.5px] text-brown">
                      {order.validationStatus === "pending"
                        ? validationLabels.pending
                        : fulfillmentLabels[order.fulfillmentStatus]}
                    </span>
                    <span className="font-semibold text-ink">{formatPrice(order.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Stock faible">
            {data.lowStock.length === 0 ? (
              <p className="text-[14px] text-muted">
                Aucun produit sous son seuil d’alerte.
              </p>
            ) : (
              <ul className="space-y-2 text-[13.5px]">
                {data.lowStock.map((product) => (
                  <li key={product.id} className="flex justify-between gap-3">
                    <span className="text-ink">{product.name}</span>
                    <span className="shrink-0 text-orange-700">
                      {product.stock} / seuil {product.threshold}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Mise en service">
            <ul className="space-y-3">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <p className="text-ink">{check.label}</p>
                    <p className="text-[12px] text-muted">{check.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${checkStyles[check.state].pill}`}
                  >
                    {checkStyles[check.state].label}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </main>
  );
}
