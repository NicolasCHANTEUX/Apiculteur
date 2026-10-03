import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/(site)/connexion/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/data/auth";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Administration", template: `%s · Administration | ${site.name}` },
  robots: { index: false, follow: false },
};

// Le contrôle d'accès est aussi refait dans chaque page, action et lecture
// admin (src/data/auth.ts) : une mise en page n'est pas réévaluée à chaque
// navigation et ne suffit pas à protéger les routes qu'elle entoure.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <header className="border-b border-line/70 bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-honey font-display text-[14px] font-semibold text-white">
              A
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-semibold text-ink">
                {site.shortName}
              </span>
              <span className="block text-[11px] text-muted">Espace apiculteur</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-[13px]">
            {admin.email ? (
              <span className="hidden text-muted sm:inline">{admin.email}</span>
            ) : null}
            <Link href="/" className="text-honey hover:text-honey-dark">
              Voir le site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-9 rounded-lg border border-line px-3 text-ink transition hover:bg-sand"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 py-2.5 sm:px-6">
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
