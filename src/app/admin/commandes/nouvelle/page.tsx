import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { PageHeader } from "@/components/admin/admin-ui";
import { ManualSaleForm } from "@/components/admin/orders/manual-sale-form";
import { listCustomerChoices } from "@/data/admin/customers";
import { listSaleProducts } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";

export const metadata: Metadata = { title: "Nouvelle vente" };

export default async function NewManualSalePage() {
  await requireAdmin("/admin/commandes/nouvelle");
  const [products, customers] = await Promise.all([listSaleProducts(), listCustomerChoices()]);

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[{ href: "/admin/commandes", label: "Commandes" }]}
        title="Nouvelle vente"
        description="Une vente conclue hors du site : au marché, par téléphone, par virement. Elle est enregistrée comme acceptée et le stock est décompté."
      />
      {/* Clé d'envoi propre à cet affichage : un double clic n'enregistre qu'une vente. */}
      <ManualSaleForm products={products} customers={customers} submissionKey={randomUUID()} />
    </main>
  );
}
