import type { EmailStatus } from "@/data/admin/emails";

const styles: Record<EmailStatus | "to_send", string> = {
  to_send: "bg-honey/15 text-honey-dark ring-honey/30",
  pending: "bg-blue-50 text-blue-800 ring-blue-200",
  sending: "bg-blue-50 text-blue-800 ring-blue-200",
  sent: "bg-green-50 text-green-800 ring-green-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
  skipped: "bg-sand text-muted ring-line",
};

/**
 * Avec un service d'envoi, un email en attente part en quelques secondes :
 * au-delà, il ne partira plus seul (préparé avant la configuration du
 * service, envoi interrompu) et redevient « à envoyer ».
 */
export function isQueued(status: EmailStatus, createdAt: string, auto: boolean, now: Date) {
  return status === "pending" && auto && now.getTime() - Date.parse(createdAt) < 2 * 60_000;
}

export function emailStatusLabel(status: EmailStatus, sentManually: boolean, queued: boolean) {
  switch (status) {
    case "pending":
      return queued ? "En file" : "À envoyer";
    case "sending":
      return "Envoi en cours";
    case "sent":
      return sentManually ? "Envoyé (messagerie)" : "Envoyé";
    case "failed":
      return "Échec";
    case "skipped":
      return "Écarté";
  }
}

/** `queued` : voir isQueued. */
export function EmailStatusPill({ status, sentManually, queued }: { status: EmailStatus; sentManually: boolean; queued: boolean }) {
  const style = styles[status === "pending" && !queued ? "to_send" : status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset ${style}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {emailStatusLabel(status, sentManually, queued)}
    </span>
  );
}
