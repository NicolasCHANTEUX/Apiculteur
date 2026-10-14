import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PageHeader, Panel, adminButton } from "@/components/admin/admin-ui";
import { CustomerEditForm, ForgetCustomerButton } from "@/components/admin/customers/customer-controls";
import { OrderStatePill } from "@/components/admin/orders/order-controls";
import { RequestKindBadge, RequestStatusPill } from "@/components/admin/requests/request-status";
import { formatPrice } from "@/components/catalog/product-display";
import { MailIcon, PhoneIcon, UploadIcon } from "@/components/icons";
import { Stars } from "@/components/ui";
import { getAdminCustomer } from "@/data/admin/customers";
import { requireAdmin } from "@/data/auth";
import { formatOrderDate } from "@/lib/orders/labels";
import { reviewStatusLabels } from "@/lib/reviews/form";

export const metadata: Metadata = { title: "Client" };

export default async function AdminCustomerPage(props: PageProps<"/admin/clients/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/clients/${id}`);
  const customer = await getAdminCustomer(id);
  if (!customer) notFound();
  const spent = customer.orders.filter((order) => order.state.key !== "refused" && order.state.key !== "cancelled").reduce((sum, order) => sum + order.total, 0);

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/clients", label: "Clients" }]}
        title={customer.name}
        meta={
          <span className="text-[13px] text-muted">
            Client depuis le {formatOrderDate(customer.createdAt)} · {customer.orders.length} commande{customer.orders.length > 1 ? "s" : ""} ·{" "}
            {formatPrice(spent)}
          </span>
        }
        actions={
          customer.anonymized ? null : (
            <>
              <a href={`/admin/clients/${customer.id}/export`} className={adminButton.secondary}>
                <UploadIcon className="size-4 rotate-180" />
                Exporter ses données
              </a>
              <ForgetCustomerButton id={customer.id} name={customer.name} orders={customer.orders.length} />
            </>
          )
        }
      />

      {customer.anonymized ? (
        <Notice tone="info">Client anonymisé : ses commandes sont conservées pour la comptabilité, sans donnée personnelle.</Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Panel title="Commandes" flush>
            {customer.orders.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">Aucune commande.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/commandes/${order.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 transition hover:bg-cream/60">
                      <span className="min-w-0">
                        <span className="block font-medium text-ink tabular-nums">{order.number}</span>
                        <span className="block text-[12.5px] text-muted">
                          {formatOrderDate(order.createdAt)}
                          {order.termsVersion ? ` · CGV v${order.termsVersion} acceptées` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold text-ink tabular-nums">{formatPrice(order.total)}</span>
                        <OrderStatePill state={order.state} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Demandes" flush>
            {customer.requests.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">Aucune demande de contact avec cette adresse.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {customer.requests.map((request) => (
                  <li key={request.id}>
                    <Link href={`/admin/demandes/${request.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 transition hover:bg-cream/60">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{request.subject}</span>
                        <span className="block text-[12.5px] text-muted">
                          {request.reference} · {formatOrderDate(request.createdAt)}
                          {request.trashed ? " · dans la corbeille" : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <RequestKindBadge kind={request.kind} />
                        <RequestStatusPill status={request.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Avis" flush>
            {customer.reviews.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">Aucun avis.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {customer.reviews.map((review) => (
                  <li key={review.id} className="space-y-1 px-5 py-3.5">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                      <Stars rating={review.rating} className="text-[12px]" />
                      {formatOrderDate(review.createdAt)} · {reviewStatusLabels[review.status].toLowerCase()}
                    </p>
                    {review.comment ? <p className="text-[14px] text-body">{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <Panel title="Coordonnées">
            {customer.anonymized ? (
              <p className="text-[13.5px] text-muted">Données personnelles effacées.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5 text-[13.5px]">
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 break-all text-honey-dark hover:underline">
                    <MailIcon className="size-3.5 shrink-0" />
                    {customer.email}
                  </a>
                  {customer.phone ? (
                    <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 text-honey-dark hover:underline">
                      <PhoneIcon className="size-3.5" />
                      {customer.phone}
                    </a>
                  ) : null}
                  {customer.address ? <p className="text-body">{customer.address}</p> : null}
                </div>
                <CustomerEditForm key={customer.updatedAt} id={customer.id} name={customer.name} phone={customer.phone ?? ""} note={customer.internalNote ?? ""} />
                <p className="border-t border-line/60 pt-3 text-[12px] text-muted">
                  L’email identifie le client : il n’est pas modifiable ici, pour ne pas séparer son historique.
                </p>
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </main>
  );
}
