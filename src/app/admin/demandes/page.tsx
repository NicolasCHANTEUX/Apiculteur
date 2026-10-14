import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, adminButton, adminInput, panelClass } from "@/components/admin/admin-ui";
import { LinkPending } from "@/components/admin/link-pending";
import { RequestKindBadge, RequestStatusPill } from "@/components/admin/requests/request-status";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardListIcon, HexagonIcon, InboxIcon, MessageCircleIcon, SearchIcon } from "@/components/icons";
import { isRequestTab, listAdminRequests, requestTabs, type RequestTab } from "@/data/admin/requests";
import { requireAdmin } from "@/data/auth";
import { formatRelativeTime } from "@/lib/admin/audit-labels";
import { formatOrderDate } from "@/lib/orders/labels";
import { isRequestKind, requestKinds, type RequestKind } from "@/lib/requests/form";

export const metadata: Metadata = { title: "Demandes" };

const kindIcons = { contact: MessageCircleIcon, quote: ClipboardListIcon, swarm: HexagonIcon } as const;
const kindPlural: Record<RequestKind, string> = { contact: "Questions", quote: "Devis", swarm: "Essaims" };

export default async function AdminRequestsPage(props: PageProps<"/admin/demandes">) {
  await requireAdmin("/admin/demandes");
  const params = await props.searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const tab: RequestTab = isRequestTab(statut) ? statut : "a-traiter";
  const rawKind = typeof params.type === "string" ? params.type : "";
  const kind = isRequestKind(rawKind) ? rawKind : null;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const result = await listAdminRequests({ tab, kind, q, page });
  const now = new Date();

  const href = (changes: { statut?: RequestTab; type?: RequestKind | null; page?: number }) => {
    const search = new URLSearchParams();
    search.set("statut", changes.statut ?? tab);
    const nextKind = changes.type === undefined ? kind : changes.type;
    if (nextKind) search.set("type", nextKind);
    if (q) search.set("q", q);
    if (changes.page && changes.page > 1) search.set("page", String(changes.page));
    return `/admin/demandes?${search.toString()}`;
  };

  return (
    <main className="space-y-6">
      <PageHeader
        title="Demandes"
        description="Questions, demandes de devis et signalements d’essaims envoyés depuis la page contact."
      />

      {result.missingTable ? (
        <Notice tone="warning">
          <p className="font-medium text-ink">Dernière étape d’installation : les demandes n’existent pas encore dans la base</p>
          <p className="mt-1">
            Appliquez la migration <code className="rounded bg-orange-100 px-1">20261015100000_contact_requests.sql</code> dans l’éditeur SQL
            de Supabase. En attendant, le formulaire de contact du site ouvre la messagerie du visiteur, comme avant.
          </p>
        </Notice>
      ) : (
        <section className={panelClass} aria-label="Boîte de réception">
          <nav aria-label="Filtrer par état" className="overflow-x-auto border-b border-line/60">
            <ul className="flex min-w-max gap-1 px-3 pt-2 sm:px-4">
              {(Object.keys(requestTabs) as RequestTab[]).map((value) => {
                const current = value === tab;
                return (
                  <li key={value}>
                    <Link
                      href={href({ statut: value, page: 1 })}
                      scroll={false}
                      aria-current={current ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-2 px-3 text-[13.5px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                        current ? "text-ink after:bg-honey" : "text-muted after:bg-transparent hover:text-ink"
                      }`}
                    >
                      {requestTabs[value]}
                      <span
                        className={`rounded-full px-1.5 py-px text-[11.5px] tabular-nums ${
                          value === "a-traiter" && result.counts[value] > 0 ? "bg-honey text-white" : current ? "bg-honey/15 text-honey-dark" : "bg-sand text-muted"
                        }`}
                      >
                        {result.counts[value]}
                      </span>
                      <LinkPending className="-ml-1 text-honey" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type de demande">
              {([null, "contact", "quote", "swarm"] as (RequestKind | null)[]).map((value) => {
                const current = value === kind;
                const count = value ? result.kindCounts[value] : result.kindCounts.all;
                return (
                  <Link
                    key={value ?? "all"}
                    href={href({ type: value, page: 1 })}
                    scroll={false}
                    aria-current={current ? "true" : undefined}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition ${
                      current ? "border-honey bg-honey/12 text-honey-dark" : "border-line bg-white text-body hover:border-parchment"
                    }`}
                  >
                    {value ? kindPlural[value] : "Tous types"}
                    <span className="text-[11.5px] text-muted tabular-nums">{count}</span>
                  </Link>
                );
              })}
            </div>
            <form action="/admin/demandes" method="get" role="search" className="flex min-w-[220px] flex-1 items-center gap-2">
              <input type="hidden" name="statut" value={tab} />
              {kind ? <input type="hidden" name="type" value={kind} /> : null}
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <label htmlFor="request-search" className="sr-only">
                  Rechercher une demande
                </label>
                <input
                  id="request-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Nom, email, référence, mot du message"
                  className={`${adminInput} h-10 pl-9`}
                />
              </div>
              <button type="submit" className={adminButton.secondary}>
                Rechercher
              </button>
            </form>
          </div>

          {result.requests.length === 0 ? (
            <div className="border-t border-line/60">
              <EmptyState
                icon={<InboxIcon className="size-5" />}
                title={q ? "Aucune demande ne correspond" : tab === "a-traiter" ? "Aucune demande à traiter" : tab === "corbeille" ? "La corbeille est vide" : "Aucune demande ici"}
              >
                {q
                  ? "Essayez un autre nom, email ou mot."
                  : tab === "a-traiter"
                    ? "Les nouveaux messages envoyés depuis la page contact arriveront ici."
                    : "Changez d’onglet pour voir les autres demandes."}
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line/60 border-t border-line/60">
              {result.requests.map((request) => {
                const Icon = kindIcons[request.kind];
                const unread = request.status === "new" && !request.deletedAt;
                return (
                  <li key={request.id}>
                    <Link
                      href={`/admin/demandes/${request.id}`}
                      className="group flex items-start gap-3.5 px-4 py-4 transition hover:bg-cream/60 sm:px-5"
                    >
                      <span
                        className={`relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                          request.kind === "swarm" ? "bg-amber-100 text-amber-800" : request.kind === "quote" ? "bg-violet-50 text-violet-700" : "bg-sand text-brown"
                        }`}
                        aria-hidden
                      >
                        <Icon className="size-4" />
                        {unread ? <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-honey" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`text-ink group-hover:text-honey-dark ${unread ? "font-semibold" : "font-medium"}`}>{request.name}</span>
                          <span className="text-[12.5px] text-muted">
                            {request.reference} ·{" "}
                            <time dateTime={request.createdAt} title={formatOrderDate(request.createdAt)}>
                              {formatRelativeTime(request.createdAt, now)}
                            </time>
                          </span>
                        </p>
                        <p className={`mt-0.5 truncate text-[14px] ${unread ? "font-medium text-ink" : "text-body"}`}>{request.subject}</p>
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{request.excerpt}</p>
                      </div>
                      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                        <RequestStatusPill status={request.status} />
                        <span className="flex items-center gap-1.5">
                          {request.photoCount ? (
                            <span className="inline-flex items-center gap-1 text-[12px] text-muted" title={`${request.photoCount} photo(s)`}>
                              <CameraIcon className="size-3.5" />
                              {request.photoCount}
                            </span>
                          ) : null}
                          <RequestKindBadge kind={request.kind} />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {result.pages > 1 ? (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-3 text-[13px] sm:px-5">
              {result.page > 1 ? (
                <Link href={href({ page: result.page - 1 })} className={adminButton.small}>
                  <ChevronLeftIcon className="size-3.5" />
                  Précédentes
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted tabular-nums">
                Page {result.page} sur {result.pages} · {result.total} demande{result.total > 1 ? "s" : ""}
              </span>
              {result.page < result.pages ? (
                <Link href={href({ page: result.page + 1 })} className={adminButton.small}>
                  Suivantes
                  <ChevronRightIcon className="size-3.5" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      )}

      <p className="text-[12.5px] text-muted">
        Formulaire public : {Object.values(requestKinds).map((value) => value.label.toLowerCase()).join(", ")}.{" "}
        <Link href="/contact" target="_blank" className="font-medium text-honey-dark hover:underline">
          Voir la page contact
        </Link>
      </p>
    </main>
  );
}
