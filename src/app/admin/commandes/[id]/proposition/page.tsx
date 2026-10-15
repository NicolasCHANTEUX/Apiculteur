import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/admin-ui";
import { ProposalForm } from "@/components/admin/orders/proposal-form";
import { getAdminOrder } from "@/data/admin/orders";
import { listSaleProducts } from "@/data/admin/products";
import { requireAdmin } from "@/data/auth";
import { getEmailConfig } from "@/data/email";
import { PROPOSAL_LINK_DAYS, centsToInput } from "@/lib/orders/admin-lines";

export const metadata: Metadata = { title: "Proposer une modification" };

export default async function OrderProposalPage(props: PageProps<"/admin/commandes/[id]/proposition">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/commandes/${id}/proposition`);
  const order = await getAdminOrder(id);
  if (!order) notFound();
  // Seule une demande à valider peut recevoir une proposition.
  if (order.state.key !== "to_validate") redirect(`/admin/commandes/${id}`);
  const products = await listSaleProducts({ include: order.lines.map((line) => line.productId) });

  return (
    <main className="space-y-6">
      <PageHeader
        breadcrumb={[
          { href: "/admin/commandes", label: "Commandes" },
          { href: `/admin/commandes/${order.id}`, label: order.orderNumber },
        ]}
        title="Proposer une modification"
        description={`Demande de ${order.customer.name}. Ajustez ce qui ne peut pas être servi tel quel : le client accepte ou décline, et le stock n’est décompté qu’à son accord.`}
      />
      <ProposalForm
        order={{
          id: order.id,
          version: order.updatedAt,
          number: order.orderNumber,
          customerName: order.customer.name,
          hasEmail: Boolean(order.customer.email),
          canDeliver: order.canDeliver,
          address: order.address ? [order.address.line1, [order.address.postalCode, order.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null,
          deliveryMethod: order.deliveryMethod,
          requestedDate: order.requestedDate,
          deliveryFee: order.deliveryFee,
          total: order.total,
          lines: order.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: centsToInput(Math.round(line.unitPrice * 100)),
            edited: false,
          })),
        }}
        products={products}
        autoEmail={Boolean(getEmailConfig().provider)}
        linkDays={PROPOSAL_LINK_DAYS}
      />
    </main>
  );
}
