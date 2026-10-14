import type { NextRequest } from "next/server";
import { exportCustomerData } from "@/data/admin/customers";
import { recordAudit } from "@/data/audit";
import { getAdminAccess } from "@/data/auth";

// Export des données d'un client (droit d'accès et de portabilité,
// CAHIER §19), en JSON, téléchargé par l'admin pour le transmettre.
export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/clients/[id]/export">) {
  const { id } = await ctx.params;
  const access = await getAdminAccess();
  if (access.status !== "admin" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Introuvable", { status: 404, headers: { "cache-control": "no-store" } });
  }
  const data = await exportCustomerData(id);
  if (!data) return new Response("Introuvable", { status: 404, headers: { "cache-control": "no-store" } });
  await recordAudit({ actorUserId: access.userId, action: "customer.exported", entityType: "customer", entityId: id });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="donnees-client-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
