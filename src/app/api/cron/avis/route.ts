import { timingSafeEqual } from "node:crypto";
import { processDueReviewInvitations } from "@/data/review-invitations";

// Tâche quotidienne (vercel.json) : envoie les demandes d'avis arrivées à
// échéance. Vercel appelle cette adresse avec « Authorization: Bearer
// CRON_SECRET » ; sans ce secret, rien n'est fait.
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
  try {
    const result = await processDueReviewInvitations({ limit: 50 });
    return Response.json(result);
  } catch (error) {
    console.error("Tâche des demandes d'avis", error instanceof Error ? error.message : error);
    return Response.json({ error: "Échec de la tâche." }, { status: 500 });
  }
}
