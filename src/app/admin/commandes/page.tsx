import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, adminButton, adminInput, panelClass } from "@/components/admin/admin-ui";
import { OrderStatePill, OrdersOpenSwitch } from "@/components/admin/orders/order-controls";
import { ChevronRightIcon, MapPinIcon, SearchIcon, ShoppingBagIcon, TruckIcon } from "@/components/icons";
import { formatPrice } from "@/components/catalog/product-display";
import { isOrderTab, listAdminOrders, orderTabs, type OrderTab } from "@/data/admin/orders";
import { LinkPending } from "@/components/admin/link-pending";
import { requireAdmin } from "@/data/auth";
import { getOrderSettings } from "@/data/settings";
import { formatRelativeTime } from "@/lib/admin/audit-labels";
import { formatOrderDate, paymentLabels } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Commandes" };

const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function AdminOrdersPage(props: PageProps<"/admin/commandes">) {
  await requireAdmin("/admin/commandes");
  const params = await props.searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const tab: OrderTab = isOrderTab(statut) ? statut : "a-valider";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const [{ orders, counts }, settings] = await Promise.all([listAdminOrders({ tab, q }), getOrderSettings()]);
  const now = new Date();
  const href = (value: OrderTab) => `/admin/commandes?statut=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <main className="space-y-6">
      <PageHeader
        title="Commandes"
        description="Les demandes envoyées depuis le site : acceptez-les ou refusez-les, puis suivez leur préparation."
        actions={<OrdersOpenSwitch open={settings.ordersOpen} />}
      />

      <section className={panelClass} aria-label="Liste des commandes">
        <nav aria-label="Filtrer par état" className="overflow-x-auto border-b border-line/60">
          <ul className="flex min-w-max gap-1 px-3 pt-2 sm:px-4">
            {(Object.keys(orderTabs) as OrderTab[]).map((value) => {
              const current = value === tab;
              return (
                <li key={value}>
                  <Link
                    href={href(value)}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-2 px-3 text-[13.5px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                      current ? "text-ink after:bg-honey" : "text-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    {orderTabs[value]}
                    <span
                      className={`rounded-full px-1.5 py-px text-[11.5px] tabular-nums ${
                        value === "a-valider" && counts[value] > 0
                          ? "bg-honey text-white"
                          : current
                            ? "bg-honey/15 text-honey-dark"
                            : "bg-sand text-muted"
                      }`}
                    >
                      {counts[value]}
                    </span>
                    <LinkPending className="-ml-1 text-honey" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form action="/admin/commandes" method="get" role="search" className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-5">
          <input type="hidden" name="statut" value={tab} />
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <label htmlFor="order-search" className="sr-only">
              Rechercher une commande
            </label>
            <input
              id="order-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Numéro, nom, email ou société"
              className={`${adminInput} h-10 pl-9`}
            />
          </div>
          <button type="submit" className={adminButton.secondary}>
            Rechercher
          </button>
          {q ? (
            <Link href={`/admin/commandes?statut=${tab}`} className="px-1 text-[13px] font-medium text-honey-dark hover:underline">
              Effacer
            </Link>
          ) : null}
        </form>

        {orders.length === 0 ? (
          <div className="border-t border-line/60">
            <EmptyState icon={<ShoppingBagIcon className="size-5" />} title={q ? "Aucune commande ne correspond" : tab === "a-valider" ? "Aucune demande à valider" : "Aucune commande ici"}>
              {q
                ? "Essayez un autre numéro, nom ou email."
                : tab === "a-valider"
                  ? settings.ordersOpen
                    ? "Les nouvelles demandes envoyées depuis le site apparaîtront ici."
                    : "Les demandes en ligne sont fermées : ouvrez-les avec l’interrupteur ci-dessus quand vous êtes prêt."
                  : "Changez d’onglet pour voir les autres commandes."}
            </EmptyState>
          </div>
        ) : (
          <>
            <div
              aria-hidden
              className="hidden border-y border-line/60 bg-cream/60 px-5 py-2 text-[11.5px] font-medium tracking-[0.06em] text-muted uppercase md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_8.5rem_1.25rem] md:gap-4"
            >
              <span>Demande</span>
              <span>Réception</span>
              <span>Total</span>
              <span>État</span>
              <span />
            </div>
            <ul className="divide-y divide-line/60 border-t border-line/60 md:border-t-0">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="group grid gap-x-4 gap-y-2 px-4 py-4 transition hover:bg-cream/60 sm:px-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_8.5rem_1.25rem] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-ink group-hover:text-honey-dark">{order.customerName}</span>
                        {order.companyName ? <span className="text-[12.5px] text-muted">· {order.companyName}</span> : null}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        <span className="font-medium text-body tabular-nums">{order.orderNumber}</span> ·{" "}
                        <time dateTime={order.createdAt} title={formatOrderDate(order.createdAt)}>
                          {formatRelativeTime(order.createdAt, now)}
                        </time>{" "}
                        · {order.totalQuantity} article{order.totalQuantity > 1 ? "s" : ""}
                      </p>
                      {order.reviewReasons.length ? (
                        <p className="mt-1.5 flex flex-wrap gap-1">
                          {order.reviewReasons.map((reason) => (
                            <Badge key={reason} tone={reason.startsWith("Grande") ? "warning" : "neutral"}>
                              {reason}
                            </Badge>
                          ))}
                        </p>
                      ) : null}
                    </div>
                    <p className="flex items-center gap-2 text-[13px] text-body">
                      {order.deliveryMethod === "delivery" ? <TruckIcon className="size-4 shrink-0 text-honey" /> : <MapPinIcon className="size-4 shrink-0 text-honey" />}
                      <span>
                        {order.deliveryMethod === "delivery" ? "Livraison" : "Retrait"}
                        {order.requestedDate ? <span className="text-muted"> · {shortDate.format(new Date(`${order.requestedDate}T12:00:00Z`))}</span> : null}
                      </span>
                    </p>
                    <p className="text-[14px]">
                      <span className="font-semibold text-ink tabular-nums">{formatPrice(order.totalAmount)}</span>
                      <span className="block text-[11.5px] text-muted">{paymentLabels[order.paymentStatus]}</span>
                    </p>
                    <div>
                      <OrderStatePill state={order.state} />
                    </div>
                    <ChevronRightIcon className="hidden size-4 text-parchment transition group-hover:translate-x-0.5 group-hover:text-honey md:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
