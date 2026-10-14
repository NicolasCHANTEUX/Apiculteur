import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, adminButton, adminInput, panelClass } from "@/components/admin/admin-ui";
import { PurgeNowButton } from "@/components/admin/customers/customer-controls";
import { formatPrice } from "@/components/catalog/product-display";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { listAdminCustomers } from "@/data/admin/customers";
import { requireAdmin } from "@/data/auth";
import { getRetention, previewPurge } from "@/data/privacy";
import { formatRelativeTime } from "@/lib/admin/audit-labels";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Clients" };

export default async function AdminCustomersPage(props: PageProps<"/admin/clients">) {
  await requireAdmin("/admin/clients");
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const retention = await getRetention();
  const [result, purge] = await Promise.all([listAdminCustomers({ q, page }), previewPurge(retention)]);
  const toPurge = purge ? Object.values(purge).reduce((sum, value) => sum + value, 0) : 0;
  const now = new Date();
  const href = (target: number) => `/admin/clients?${new URLSearchParams({ ...(q ? { q } : {}), ...(target > 1 ? { page: String(target) } : {}) }).toString()}`;

  return (
    <main className="space-y-6">
      <PageHeader title="Clients" description="Les personnes qui vous ont envoyé une demande de commande, avec leur historique." />

      {params.efface === "supprime" ? <Notice tone="success">Client supprimé, avec ses demandes et ses emails.</Notice> : null}
      {params.efface === "anonymise" ? (
        <Notice tone="success">Client anonymisé : ses commandes restent pour la comptabilité, sans aucune donnée personnelle.</Notice>
      ) : null}

      <section className={`${panelClass} flex flex-wrap items-center justify-between gap-4 px-5 py-4`} aria-label="Conservation des données">
        <div className="min-w-0 text-[13.5px] leading-[1.55]">
          <p className="font-medium text-ink">Conservation des données</p>
          <p className="text-muted">
            Demandes traitées : {retention.requestsRetentionMonths} mois · corbeille : {retention.trashDays} jours · journal des emails :{" "}
            {retention.emailLogMonths} mois · commandes : 10 ans.{" "}
            <Link href="/admin/informations-legales" className="font-medium text-honey-dark hover:underline">
              Modifier
            </Link>
          </p>
          <p className={toPurge ? "text-orange-800" : "text-green-700"}>
            {purge === null
              ? "Aperçu indisponible."
              : toPurge
                ? `${toPurge} élément${toPurge > 1 ? "s ont" : " a"} dépassé leur durée : supprimés chaque matin par la tâche quotidienne.`
                : "Rien à supprimer pour le moment."}
          </p>
        </div>
        {toPurge ? <PurgeNowButton total={toPurge} /> : null}
      </section>

      <section className={panelClass} aria-label="Liste des clients">
        <form action="/admin/clients" method="get" role="search" className="flex flex-wrap items-center gap-2.5 border-b border-line/60 px-4 py-3.5 sm:px-5">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <label htmlFor="customer-search" className="sr-only">
              Rechercher un client
            </label>
            <input id="customer-search" name="q" type="search" defaultValue={q} placeholder="Nom, email, téléphone ou ville" className={`${adminInput} h-10 pl-9`} />
          </div>
          <button type="submit" className={adminButton.secondary}>
            Rechercher
          </button>
          <span className="text-[12.5px] text-muted tabular-nums">
            {result.total} client{result.total > 1 ? "s" : ""}
          </span>
        </form>

        {result.customers.length === 0 ? (
          <EmptyState icon={<UsersIcon className="size-5" />} title={q ? "Aucun client ne correspond" : "Aucun client pour le moment"}>
            {q ? "Essayez un autre nom, email ou ville." : "Une fiche est créée à la première demande de commande."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {result.customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/clients/${customer.id}`}
                  className="group grid gap-x-4 gap-y-1 px-4 py-3.5 transition hover:bg-cream/60 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_8rem_1rem] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink group-hover:text-honey-dark">
                      {customer.name}
                      {customer.anonymized ? <span className="rounded-md bg-sand px-1.5 py-0.5 text-[11px] font-medium text-brown">Anonymisé</span> : null}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">{customer.anonymized ? "—" : customer.email}</p>
                  </div>
                  <p className="truncate text-[13px] text-body">{[customer.phone, customer.city].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="text-[13px] text-body">
                    <span className="font-medium text-ink tabular-nums">{customer.orders}</span> commande{customer.orders > 1 ? "s" : ""}
                  </p>
                  <p className="text-[13px]">
                    <span className="font-semibold text-ink tabular-nums">{formatPrice(customer.spent)}</span>
                    <span className="block text-[11.5px] text-muted">
                      {customer.lastOrderAt ? (
                        <time dateTime={customer.lastOrderAt} title={formatOrderDate(customer.lastOrderAt)}>
                          {formatRelativeTime(customer.lastOrderAt, now)}
                        </time>
                      ) : (
                        "aucune commande"
                      )}
                    </span>
                  </p>
                  <ChevronRightIcon className="hidden size-4 text-parchment transition group-hover:text-honey md:block" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {result.pages > 1 ? (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-3 text-[13px] sm:px-5">
            {result.page > 1 ? (
              <Link href={href(result.page - 1)} className={adminButton.small}>
                <ChevronLeftIcon className="size-3.5" />
                Précédents
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted tabular-nums">
              Page {result.page} sur {result.pages}
            </span>
            {result.page < result.pages ? (
              <Link href={href(result.page + 1)} className={adminButton.small}>
                Suivants
                <ChevronRightIcon className="size-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
