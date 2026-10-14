import { timingSafeEqual } from "node:crypto";
import { runPurge } from "@/data/privacy";
import { processDueReviewInvitations } from "@/data/review-invitations";

// Tâche quotidienne (vercel.json) : demandes d'avis arrivées à échéance,
// puis purge des données dont la durée de conservation est dépassée.
// Vercel appelle cette adresse avec « Authorization: Bearer CRON_SECRET » ;
// sans ce secret, rien n'est fait.
function authorized(request: Request, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return Response.json({ error: "CRON_SECRET n’est pas configuré." }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }
  const report: Record<string, unknown> = {};
  let failed = false;
  try {
    report.reviews = await processDueReviewInvitations({ limit: 50 });
  } catch (error) {
    failed = true;
    console.error("Tâche quotidienne : demandes d'avis", error instanceof Error ? error.message : error);
  }
  try {
    report.purge = await runPurge();
  } catch (error) {
    failed = true;
    console.error("Tâche quotidienne : purge", error instanceof Error ? error.message : error);
  }
  return Response.json(report, { status: failed ? 500 : 200 });
}
