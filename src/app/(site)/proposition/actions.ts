"use server";

import { redirect } from "next/navigation";
import { scheduleOrderEmails } from "@/data/email";
import { hashLinkToken, isLinkTokenShape } from "@/lib/security/link-token";
import { RateLimitError, currentClientIp, enforceRateLimit } from "@/lib/security/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProposalAnswerState = { status: "idle" | "error"; message: string };

const UNAVAILABLE = "L’envoi est momentanément impossible. Réessayez dans un instant.";

function failure(message: string): ProposalAnswerState {
  return { status: "error", message };
}

// Réponse du client à une proposition de modification, par le lien reçu
// par email (CAHIER §8.2, H6). Le jeton n'est vérifié que par la base
// (fonction respond_order_proposal, clé serveur).
export async function answerProposalAction(_previous: ProposalAnswerState, formData: FormData): Promise<ProposalAnswerState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !isLinkTokenShape(token)) return failure("Ce lien n’est pas valide.");
  const decision = formData.get("decision");
  if (decision !== "accept" && decision !== "decline") return failure("Choisissez d’accepter ou de décliner la proposition.");
  const rawReply = formData.get("reply");
  const reply = typeof rawReply === "string" ? rawReply.trim() : "";
  if (reply.length > 2000) return failure("Votre message est trop long (2 000 caractères au maximum).");

  try {
    await enforceRateLimit({ scope: "proposal-answer-ip", identifier: await currentClientIp(), limit: 10, windowSeconds: 3600 });
  } catch (error) {
    if (error instanceof RateLimitError) return failure("Trop d’essais : patientez un peu avant de réessayer.");
    console.error("Proposition : limitation indisponible", error);
    return failure(UNAVAILABLE);
  }

  const { data, error } = await createAdminClient()
    .rpc("respond_order_proposal", { p_token_hash: hashLinkToken(token), p_accept: decision === "accept", p_reply: reply })
    .single<{ order_id: string; order_number: string; outcome: "accepted" | "accepted_stock_short" | "declined" }>();

  if (error || !data) {
    // Déjà répondu ou retirée : la page affiche où en est la proposition.
    if (error?.code === "55000") redirect(`/proposition/${token}`);
    if (error?.code === "P0002") return failure("Ce lien n’est pas valide.");
    if (error?.code === "22023" && error.message.includes("expire")) return failure("Ce lien a expiré : écrivez-moi et je reviendrai vers vous.");
    console.error("Proposition : réponse", error?.code, error?.message);
    return failure(UNAVAILABLE);
  }

  // Confirmation au client si sa commande est acceptée ; alerte pour
  // l'apiculteur dans tous les cas. Envoyés après la réponse.
  if (data.outcome === "accepted") await scheduleOrderEmails(data.order_id, ["order_accepted"]);
  await scheduleOrderEmails(data.order_id, ["order_proposal_admin"], {
    dedupeSuffix: hashLinkToken(token).slice(0, 16),
    extra: { proposalOutcome: data.outcome, proposalReply: reply || null },
  });
  redirect(`/proposition/merci?reponse=${data.outcome === "declined" ? "declinee" : data.outcome === "accepted" ? "acceptee" : "a-confirmer"}`);
}
