import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/admin-ui";
import { LegalForm } from "@/components/admin/legal/legal-form";
import { CircleCheckIcon, ExternalLinkIcon } from "@/components/icons";
import { getLegalAdminState } from "@/data/admin/legal";
import { requireAdmin } from "@/data/auth";
import { formatOrderDate } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Informations légales" };

export default async function AdminLegalPage() {
  await requireAdmin("/admin/informations-legales");
  const state = await getLegalAdminState();

  return (
    <main className="space-y-6">
      <PageHeader
        title="Informations légales"
        description="Mentions légales, conditions générales de vente et politique de confidentialité, générées à partir de ces informations."
      />

      {!state.available ? (
        <Notice tone="warning">
          Appliquez la migration <code className="rounded bg-orange-100 px-1">20261017100000_legal_customers.sql</code> dans l’éditeur SQL de
          Supabase pour pouvoir publier. Vous pouvez déjà préparer et enregistrer le brouillon.
        </Notice>
      ) : state.published ? (
        <Notice tone={state.changed ? "warning" : "success"}>
          <p className="font-medium text-ink">
            Version {state.published.version} en ligne depuis le {formatOrderDate(state.published.approvedAt)}.
          </p>
          <p className="mt-0.5">
            {state.changed
              ? "Le brouillon ci-dessous contient des modifications non publiées : approuvez-les pour créer une nouvelle version."
              : "Le brouillon est identique à la version en ligne."}{" "}
            <span className="inline-flex flex-wrap gap-x-3">
              {[
                ["/mentions-legales", "Mentions légales"],
                ["/cgv", "CGV"],
                ["/confidentialite", "Confidentialité"],
              ].map(([href, label]) => (
                <Link key={href} href={href} target="_blank" className="inline-flex items-center gap-1 font-medium text-honey-dark hover:underline">
                  {label}
                  <ExternalLinkIcon className="size-3" />
                </Link>
              ))}
            </span>
          </p>
        </Notice>
      ) : (
        <Notice tone="info">
          <p className="font-medium text-ink">Aucune version publiée : les pages légales sont masquées sur le site.</p>
          <p className="mt-0.5">
            Elles n’apparaissent ni dans le pied de page ni dans les formulaires tant que ces informations ne sont pas complètes, sans valeur
            provisoire, et approuvées. Remplissez-les quand vous les avez : le brouillon peut être enregistré à tout moment.
          </p>
        </Notice>
      )}

      <LegalForm key={state.draftSavedAt ?? "initial"} initial={state.draft} />

      {state.versions.length ? (
        <section className="rounded-2xl border border-line/70 bg-white p-5 sm:p-6" aria-label="Versions publiées">
          <h2 className="font-display text-[17px] font-semibold text-ink">Versions publiées</h2>
          <ul className="mt-3 divide-y divide-line/60 text-[13.5px]">
            {state.versions.map((version, index) => (
              <li key={version.version} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium text-ink">Version {version.version}</span>
                <span className="flex items-center gap-2 text-muted">
                  {formatOrderDate(version.approvedAt)}
                  {index === 0 ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CircleCheckIcon className="size-3.5" /> en ligne
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-muted">
            Chaque commande garde la version des CGV acceptée par le client. Les versions ne sont jamais modifiées.
          </p>
        </section>
      ) : null}
    </main>
  );
}
