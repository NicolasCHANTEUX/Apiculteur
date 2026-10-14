// Pilote d'envoi interchangeable (ROADMAP H7). Le fournisseur est choisi par
// variables d'environnement ; sans fournisseur, rien n'est envoyé et les
// emails restent « à envoyer » dans l'admin. Sans dépendance à Next
// (testable avec un faux `fetch`).

export const emailProviders = { brevo: "Brevo", resend: "Resend" } as const;
export type EmailProvider = keyof typeof emailProviders;

export type Mailbox = { email: string; name: string | null };

export type EmailConfig = {
  provider: EmailProvider | null;
  apiKey: string | null;
  from: Mailbox | null;
  replyTo: string | null;
  /** Destinataire des alertes « nouvelle demande ». */
  adminEmail: string | null;
  /** Réglages manquants ou invalides, en clair pour l'admin (jamais de valeur). */
  problems: string[];
};

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

export function isEmailAddress(value: string) {
  return value.length <= 254 && EMAIL.test(value);
}

/** « Ruchers de Normandie <contact@exemple.fr> » ou « contact@exemple.fr ». */
export function parseMailbox(value: string | undefined): Mailbox | null {
  const raw = value?.trim();
  if (!raw) return null;
  const named = /^(.*?)\s*<([^<>]+)>$/.exec(raw);
  const email = (named ? named[2] : raw).trim();
  if (!isEmailAddress(email)) return null;
  const name = named?.[1].trim().replace(/^"(.*)"$/, "$1").trim() || null;
  return { email, name };
}

type Env = Record<string, string | undefined>;

export function readEmailConfig(env: Env): EmailConfig {
  const problems: string[] = [];
  const rawProvider = env.EMAIL_PROVIDER?.trim().toLowerCase() || "";
  let provider: EmailProvider | null = null;
  if (rawProvider === "brevo" || rawProvider === "resend") provider = rawProvider;
  else if (rawProvider && rawProvider !== "none") problems.push("EMAIL_PROVIDER doit valoir « brevo » ou « resend ».");

  const apiKey = env.EMAIL_API_KEY?.trim() || null;
  const from = parseMailbox(env.EMAIL_FROM);
  if (provider && !apiKey) problems.push("EMAIL_API_KEY est vide.");
  if (provider && !from) problems.push(env.EMAIL_FROM?.trim() ? "EMAIL_FROM n’est pas une adresse valide." : "EMAIL_FROM est vide.");

  const replyTo = env.EMAIL_REPLY_TO?.trim() || null;
  if (replyTo && !isEmailAddress(replyTo)) problems.push("EMAIL_REPLY_TO n’est pas une adresse valide.");
  const adminEmail = env.ADMIN_NOTIFICATION_EMAIL?.trim() || null;
  if (adminEmail && !isEmailAddress(adminEmail)) problems.push("ADMIN_NOTIFICATION_EMAIL n’est pas une adresse valide.");

  return {
    provider: provider && apiKey && from ? provider : null,
    apiKey,
    from,
    replyTo: replyTo && isEmailAddress(replyTo) ? replyTo : null,
    adminEmail: adminEmail && isEmailAddress(adminEmail) ? adminEmail : null,
    problems,
  };
}

export type OutgoingEmail = {
  to: Mailbox;
  replyTo: string | null;
  subject: string;
  html: string;
  text: string;
  /** Identifiant stable : évite un double envoi si la requête est rejouée. */
  idempotencyKey: string;
};

export class EmailSendError extends Error {
  /** Erreur définitive (adresse refusée…) : inutile de réessayer tel quel. */
  readonly permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = "EmailSendError";
    this.permanent = permanent;
  }
}

export type EmailDriver = {
  provider: EmailProvider;
  send(email: OutgoingEmail): Promise<{ messageId: string | null }>;
};

type Fetch = typeof fetch;

function formatMailbox(mailbox: Mailbox) {
  return mailbox.name ? `${mailbox.name.replace(/["<>]/g, "")} <${mailbox.email}>` : mailbox.email;
}

/** Message d'erreur du fournisseur, court et sans donnée personnelle. */
async function providerError(provider: string, response: Response) {
  let detail = "";
  try {
    const body = (await response.json()) as { message?: unknown; code?: unknown; name?: unknown };
    const parts = [body.code ?? body.name, body.message].filter((part) => typeof part === "string");
    detail = parts.join(" : ");
  } catch {
    // Corps illisible : le code HTTP suffit.
  }
  const message = `${provider} HTTP ${response.status}${detail ? ` — ${detail}` : ""}`
    .replace(/[^\s@<>]+@[^\s@<>]+/g, "[adresse]")
    .slice(0, 300);
  // 429 et 5xx : passagers. 4xx : requête refusée (clé, domaine, adresse).
  return new EmailSendError(message, response.status >= 400 && response.status < 500 && response.status !== 429);
}

async function post(fetchImpl: Fetch, provider: string, url: string, headers: Record<string, string>, body: unknown) {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "délai dépassé" : "service injoignable";
    throw new EmailSendError(`${provider} : ${reason}`, false);
  }
  if (!response.ok) throw await providerError(provider, response);
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function createEmailDriver(config: EmailConfig, fetchImpl: Fetch = fetch): EmailDriver | null {
  const { provider, apiKey, from } = config;
  if (!provider || !apiKey || !from) return null;

  if (provider === "brevo") {
    return {
      provider,
      async send(email) {
        // https://developers.brevo.com/reference/sendtransacemail
        const data = await post(fetchImpl, "Brevo", "https://api.brevo.com/v3/smtp/email", { "api-key": apiKey }, {
          sender: { email: from.email, ...(from.name ? { name: from.name } : {}) },
          to: [{ email: email.to.email, ...(email.to.name ? { name: email.to.name } : {}) }],
          ...(email.replyTo ? { replyTo: { email: email.replyTo } } : {}),
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
          headers: { "X-Entity-Ref-ID": email.idempotencyKey },
        });
        return { messageId: typeof data.messageId === "string" ? data.messageId : null };
      },
    };
  }

  return {
    provider,
    async send(email) {
      // https://resend.com/docs/api-reference/emails/send-email
      const data = await post(
        fetchImpl,
        "Resend",
        "https://api.resend.com/emails",
        { authorization: `Bearer ${apiKey}`, "idempotency-key": email.idempotencyKey },
        {
          from: formatMailbox(from),
          to: [formatMailbox(email.to)],
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          subject: email.subject,
          html: email.html,
          text: email.text,
        },
      );
      return { messageId: typeof data.id === "string" ? data.id : null };
    },
  };
}
