import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { countOrdersToValidate } from "@/data/admin/orders";
import { listCommandProducts } from "@/data/admin/products";
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
  const [products, pendingOrders] = await Promise.all([listCommandProducts(), countOrdersToValidate()]);
  return (
    <AdminShell email={admin.email} products={products} pendingOrders={pendingOrders}>
      {children}
    </AdminShell>
  );
}
