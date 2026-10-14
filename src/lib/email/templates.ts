// Modèles des emails de commande (CAHIER §14, ROADMAP lot 6). Chaque modèle
// produit un sujet, une version HTML et une version texte. Fonctions pures,
// sans dépendance à Next (testables) ; toutes les valeurs venant du client ou
// de l'admin sont échappées dans la version HTML.

export const emailTemplates = {
  order_received: "Demande reçue",
  order_new_admin: "Nouvelle demande (pour vous)",
  order_accepted: "Demande acceptée",
  order_refused: "Demande refusée",
  order_cancelled: "Commande annulée",
  order_ready: "Commande prête",
  order_paid: "Paiement reçu",
  order_shipped: "Commande en route",
  request_received: "Message reçu",
  request_new_admin: "Nouvelle demande client (pour vous)",
  request_reply: "Votre réponse",
  review_request: "Demande d’avis",
  review_new_admin: "Nouvel avis (pour vous)",
  review_thanks: "Merci pour l’avis",
  test: "Email de test",
} as const;

export type EmailTemplate = keyof typeof emailTemplates;

/** Modèles d'une étape de commande. */
export type OrderTemplate = Extract<EmailTemplate, `order_${string}`>;
/** Modèles d'une demande client (contact, devis, essaim). */
export type RequestTemplate = Extract<EmailTemplate, `request_${string}`>;
/** Modèles des avis clients. */
export type ReviewTemplate = Extract<EmailTemplate, `review_${string}`>;

export function isEmailTemplate(value: string): value is EmailTemplate {
  return Object.hasOwn(emailTemplates, value);
}

export type OrderEmailContext = {
  id: string;
  number: string;
  customerName: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  lines: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  totalCents: number;
  deliveryMethod: "pickup" | "delivery";
  address: string | null;
  /** Date souhaitée, AAAA-MM-JJ. */
  requestedDate: string | null;
  customerMessage: string | null;
  /** Message de l'apiculteur saisi en acceptant, refusant ou annulant. */
  note: string | null;
  paymentMethod: string | null;
  paid: boolean;
  /** Frais de livraison retenus (0 : à convenir). */
  deliveryFeeCents: number;
  /** Adresse de retrait : publique, ou communiquée à l'acceptation. */
  pickupAddress: { public: string | null; afterAcceptance: string | null };
  reviewReasons: string[];
};

export type EmailIdentity = {
  siteName: string;
  /** Signature, ex. « Marc Dupont ». */
  ownerName: string;
  ownerFirstName: string;
  /** Origine publique du site, sans barre finale. */
  siteUrl: string;
  contactEmail: string;
  phone: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const colors = {
  cream: "#faf7f0",
  line: "#e8e0d0",
  honey: "#d99a2b",
  honeyDark: "#a86f12",
  ink: "#262626",
  body: "#4a4a4a",
  muted: "#7a7269",
};

const price = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Espaces fines insécables de Intl remplacées : rendu identique partout. */
export function formatEuros(cents: number) {
  return price.format(cents / 100).replace(/[  ]/g, " ");
}

function formatDay(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : day.format(date);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texte libre (plusieurs lignes) en HTML échappé. */
function multiline(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

// Blocs de contenu : chacun sait se rendre en HTML et en texte, ce qui garde
// les deux versions alignées.
type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; label: string; text: string }
  | { kind: "summary"; order: OrderEmailContext; pickupAddress: string | null }
  | { kind: "details"; rows: [string, string][] }
  | { kind: "button"; label: string; href: string };

function paragraph(text: string): Block {
  return { kind: "paragraph", text };
}

function receptionRows(order: OrderEmailContext, pickupAddress: string | null): [string, string][] {
  const rows: [string, string][] = [
    ["Mode", order.deliveryMethod === "delivery" ? "Livraison" : "Retrait sur l’exploitation"],
  ];
  if (order.deliveryMethod === "delivery" && order.address) rows.push(["Adresse", order.address]);
  if (order.deliveryMethod === "pickup" && pickupAddress) rows.push(["Adresse de retrait", pickupAddress]);
  rows.push(["Date souhaitée", order.requestedDate ? formatDay(order.requestedDate) : "à convenir ensemble"]);
  return rows;
}

function deliveryAmount(order: OrderEmailContext) {
  return order.deliveryFeeCents > 0 ? formatEuros(order.deliveryFeeCents) : "à convenir";
}

function lineLabel(line: OrderEmailContext["lines"][number]) {
  return `${line.quantity} × ${line.name}`;
}

function lineAmount(line: OrderEmailContext["lines"][number]) {
  return line.lineTotalCents > 0 ? formatEuros(line.lineTotalCents) : "prix à confirmer";
}

function renderHtmlBlock(block: Block): string {
  switch (block.kind) {
    case "paragraph":
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${colors.body}">${multiline(block.text)}</p>`;
    case "quote":
      return `<div style="margin:0 0 18px;padding:12px 16px;border-left:3px solid ${colors.honey};background:${colors.cream};border-radius:0 8px 8px 0">`
        + `<p style="margin:0 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${colors.muted}">${escapeHtml(block.label)}</p>`
        + `<p style="margin:0;font-size:15px;line-height:1.6;color:${colors.ink}">${multiline(block.text)}</p></div>`;
    case "summary": {
      const { order } = block;
      const rows = order.lines
        .map(
          (line) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid ${colors.line};font-size:14px;color:${colors.ink}">${escapeHtml(lineLabel(line))}</td>`
            + `<td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${colors.line};font-size:14px;color:${colors.ink};white-space:nowrap">${escapeHtml(lineAmount(line))}</td></tr>`,
        )
        .join("")
        + (order.deliveryMethod === "delivery"
          ? `<tr><td style="padding:10px 0;border-bottom:1px solid ${colors.line};font-size:14px;color:${colors.ink}">Livraison</td>`
            + `<td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${colors.line};font-size:14px;color:${colors.ink};white-space:nowrap">${escapeHtml(deliveryAmount(order))}</td></tr>`
          : "");
      return `<p style="margin:8px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${colors.muted}">Demande ${escapeHtml(order.number)}</p>`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 6px">${rows}`
        + `<tr><td style="padding:12px 0 0;font-size:15px;font-weight:bold;color:${colors.ink}">Total</td>`
        + `<td align="right" style="padding:12px 0 0 12px;font-size:15px;font-weight:bold;color:${colors.ink};white-space:nowrap">${escapeHtml(formatEuros(order.totalCents))}</td></tr></table>`
        + (order.lines.some((line) => line.lineTotalCents === 0)
          ? `<p style="margin:0 0 6px;font-size:13px;color:${colors.muted}">Certains prix seront confirmés avec vous.</p>`
          : "")
        + renderHtmlBlock({ kind: "details", rows: receptionRows(order, block.pickupAddress) });
    }
    case "details":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:10px 0 18px">${block.rows
        .map(
          ([label, value]) =>
            `<tr><td valign="top" width="120" style="width:120px;padding:4px 12px 4px 0;font-size:13px;color:${colors.muted};white-space:nowrap">${escapeHtml(label)}</td>`
            + `<td style="padding:4px 0;font-size:14px;color:${colors.ink}">${multiline(value)}</td></tr>`,
        )
        .join("")}</table>`;
    case "button":
      return `<p style="margin:8px 0 22px"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${colors.honey};color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${escapeHtml(block.label)}</a></p>`;
  }
}

function renderTextBlock(block: Block): string {
  switch (block.kind) {
    case "paragraph":
      return block.text;
    case "quote":
      return `${block.label}\n${block.text
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join("\n")}`;
    case "summary": {
      const { order } = block;
      return [
        `Demande ${order.number}`,
        ...order.lines.map((line) => `- ${lineLabel(line)} : ${lineAmount(line)}`),
        ...(order.deliveryMethod === "delivery" ? [`- Livraison : ${deliveryAmount(order)}`] : []),
        `Total : ${formatEuros(order.totalCents)}`,
        ...(order.lines.some((line) => line.lineTotalCents === 0) ? ["Certains prix seront confirmés avec vous."] : []),
        "",
        renderTextBlock({ kind: "details", rows: receptionRows(order, block.pickupAddress) }),
      ].join("\n");
    }
    case "details":
      return block.rows.map(([label, value]) => `${label} : ${value.replace(/\r?\n/g, ", ")}`).join("\n");
    case "button":
      return `${block.label} : ${block.href}`;
  }
}

function layout(identity: EmailIdentity, preheader: string, blocks: Block[], signed: boolean): { html: string; text: string } {
  const signature = signed ? [paragraph(`Bien à vous,\n${identity.ownerName}\n${identity.siteName}`)] : [];
  const all = [...blocks, ...signature];
  const footer = `${identity.siteName} · ${identity.phone} · ${identity.contactEmail}`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(identity.siteName)}</title></head>`
    + `<body style="margin:0;padding:0;background:${colors.cream}">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.cream}"><tr><td align="center" style="padding:28px 14px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">`
    + `<tr><td style="padding:0 6px 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:${colors.ink}">`
    + `<span style="color:${colors.honey}">&#11042;</span> ${escapeHtml(identity.siteName)}</td></tr>`
    + `<tr><td style="padding:28px 28px 12px;background:#ffffff;border:1px solid ${colors.line};border-radius:14px">${all.map(renderHtmlBlock).join("")}</td></tr>`
    + `<tr><td style="padding:16px 6px;font-size:12px;line-height:1.6;color:${colors.muted}">${escapeHtml(footer)}<br>`
    + `<a href="${escapeHtml(identity.siteUrl)}" style="color:${colors.honeyDark}">${escapeHtml(identity.siteUrl.replace(/^https?:\/\//, ""))}</a></td></tr>`
    + `</table></td></tr></table></body></html>`;
  const text = [...all.map(renderTextBlock), "—", footer, identity.siteUrl].join("\n\n");
  return { html, text };
}

const contactLine = (identity: EmailIdentity) =>
  `Une question ? Répondez simplement à cet email, ou appelez-moi au ${identity.phone}.`;

/** Email d'une étape de commande. */
export function renderOrderEmail(template: OrderTemplate, order: OrderEmailContext, identity: EmailIdentity): RenderedEmail {
  const hello = paragraph(`Bonjour ${order.customerName},`);
  const note = (label: string): Block[] => (order.note ? [{ kind: "quote", label, text: order.note }] : []);
  const isPickup = order.deliveryMethod === "pickup";
  // L'adresse de retrait non publique n'apparaît qu'une fois la commande acceptée.
  const pickup = template === "order_accepted" || template === "order_ready" ? order.pickupAddress.afterAcceptance : order.pickupAddress.public;

  switch (template) {
    case "order_received": {
      const subject = `Votre demande ${order.number} est bien reçue`;
      return {
        subject,
        ...layout(identity, "Merci ! Je reviens vers vous pour confirmer chaque détail.", [
          hello,
          paragraph("Merci pour votre demande ! Je l’ai bien reçue et je l’étudie au plus vite : disponibilités, quantités et organisation du retrait ou de la livraison."),
          paragraph("Je vous recontacte ensuite pour la confirmer avec vous. Aucun paiement ne vous est demandé à cette étape."),
          { kind: "summary", order, pickupAddress: pickup },
          ...(order.customerMessage ? [{ kind: "quote", label: "Votre message", text: order.customerMessage } satisfies Block] : []),
          paragraph(contactLine(identity)),
        ], true),
      };
    }
    case "order_new_admin": {
      const who = order.companyName ? `${order.customerName} (${order.companyName})` : order.customerName;
      const subject = `Nouvelle demande ${order.number} — ${who}`;
      const contact: [string, string][] = [["Client", who], ["Email", order.email]];
      if (order.phone) contact.push(["Téléphone", order.phone]);
      return {
        subject,
        ...layout(identity, `${who} : ${formatEuros(order.totalCents)}`, [
          paragraph(`Une nouvelle demande vient d’arriver sur le site : ${order.number}, ${formatEuros(order.totalCents)}.`),
          ...(order.reviewReasons.length ? [paragraph(`À regarder de près : ${order.reviewReasons.join(", ")}.`)] : []),
          { kind: "button", label: "Voir la demande", href: `${identity.siteUrl}/admin/commandes/${order.id}` },
          { kind: "details", rows: contact },
          { kind: "summary", order, pickupAddress: pickup },
          ...(order.customerMessage ? [{ kind: "quote", label: "Message du client", text: order.customerMessage } satisfies Block] : []),
          paragraph("Le client a reçu un accusé de réception. Répondre à cet email écrit au client."),
        ], false),
      };
    }
    case "order_accepted":
      return {
        subject: `Votre demande ${order.number} est acceptée`,
        ...layout(identity, "Bonne nouvelle : je prépare votre commande.", [
          hello,
          paragraph(
            isPickup
              ? "Bonne nouvelle : votre demande est acceptée et je prépare votre commande. Nous convenons ensemble du jour et de l’heure du retrait."
              : "Bonne nouvelle : votre demande est acceptée et je prépare votre commande. Je reviens vers vous pour organiser la livraison.",
          ),
          ...note(`Un mot de ${identity.ownerFirstName}`),
          { kind: "summary", order, pickupAddress: pickup },
          paragraph("Le règlement se fait selon les modalités que nous confirmons ensemble."),
          paragraph(contactLine(identity)),
        ], true),
      };
    case "order_refused":
      return {
        subject: `Votre demande ${order.number}`,
        ...layout(identity, "Ma réponse à votre demande.", [
          hello,
          paragraph("Merci pour votre demande. Je suis malheureusement dans l’impossibilité d’y donner suite."),
          ...note("Précision"),
          paragraph("N’hésitez pas à me répondre si vous souhaitez en parler ou envisager une autre solution : je ferai mon possible."),
          { kind: "summary", order, pickupAddress: pickup },
        ], true),
      };
    case "order_cancelled":
      return {
        subject: `Annulation de votre commande ${order.number}`,
        ...layout(identity, "Confirmation d’annulation.", [
          hello,
          paragraph(`Je vous confirme l’annulation de votre commande ${order.number}.`),
          ...note("Précision"),
          ...(order.paid ? [paragraph("Votre règlement vous sera remboursé : je reviens vers vous à ce sujet.")] : []),
          { kind: "summary", order, pickupAddress: pickup },
          paragraph(contactLine(identity)),
        ], true),
      };
    case "order_ready":
      return {
        subject: `Votre commande ${order.number} est prête`,
        ...layout(identity, isPickup ? "Vous pouvez venir la retirer." : "Je vous contacte pour la livraison.", [
          hello,
          paragraph(
            isPickup
              ? "Votre commande est prête ! Vous pouvez venir la retirer au moment convenu ensemble. Si rien n’est encore fixé, répondez à cet email pour choisir un créneau."
              : "Votre commande est prête ! Je vous contacte pour fixer le moment de la livraison.",
          ),
          { kind: "summary", order, pickupAddress: pickup },
          paragraph(contactLine(identity)),
        ], true),
      };
    case "order_shipped":
      return {
        subject: `Votre commande ${order.number} est en route`,
        ...layout(identity, "Votre commande est en chemin.", [
          hello,
          paragraph("Votre commande est en route ! Elle vous sera remise au moment convenu ensemble. Prévoyez un endroit calme et ombragé pour accueillir les abeilles à leur arrivée."),
          { kind: "summary", order, pickupAddress: null },
          paragraph(contactLine(identity)),
        ], true),
      };
    case "order_paid":
      return {
        subject: `Paiement reçu — commande ${order.number}`,
        ...layout(identity, "Merci pour votre règlement.", [
          hello,
          paragraph(
            `J’ai bien reçu votre règlement de ${formatEuros(order.totalCents)}${order.paymentMethod ? ` (${order.paymentMethod.toLowerCase()})` : ""}. Merci !`,
          ),
          { kind: "summary", order, pickupAddress: pickup },
          paragraph("Ce message confirme la réception de votre paiement ; il ne remplace pas une facture."),
        ], true),
      };
  }
}

export type RequestEmailContext = {
  id: string;
  reference: string;
  /** « Question », « Devis », « Essaim ». */
  kindLabel: string;
  customerName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  /** Détails propres au type, déjà mis en forme. */
  details: [string, string][];
  productName: string | null;
  photoCount: number;
  /** Réponse de l'apiculteur (modèle request_reply). */
  reply: string | null;
};

/** Emails d'une demande client : accusé de réception, alerte, réponse. */
export function renderRequestEmail(template: RequestTemplate, request: RequestEmailContext, identity: EmailIdentity): RenderedEmail {
  const recap: Block[] = [
    { kind: "details", rows: [["Demande", `${request.reference} · ${request.kindLabel}`], ["Sujet", request.subject], ...(request.productName ? [["Produit", request.productName] as [string, string]] : []), ...request.details] },
  ];
  const photos = request.photoCount ? `${request.photoCount} photo${request.photoCount > 1 ? "s" : ""} jointe${request.photoCount > 1 ? "s" : ""}` : null;

  switch (template) {
    case "request_received":
      return {
        subject: `J’ai bien reçu votre message — ${request.reference}`,
        ...layout(identity, "Je vous réponds personnellement, au plus vite.", [
          paragraph(`Bonjour ${request.customerName},`),
          paragraph(
            request.kindLabel === "Essaim"
              ? "Merci de votre signalement ! Je regarde au plus vite si je peux venir récupérer l’essaim, et je vous appelle. En attendant, gardez vos distances : un essaim est en général calme, mais mieux vaut ne pas le déranger."
              : "Merci pour votre message ! Je l’ai bien reçu et je vous réponds personnellement, au plus vite.",
          ),
          ...recap,
          { kind: "quote", label: "Votre message", text: request.message },
          ...(photos ? [paragraph(`${photos} à votre message.`)] : []),
          paragraph(contactLine(identity)),
        ], true),
      };
    case "request_new_admin": {
      const contact: [string, string][] = [["De", request.customerName], ["Email", request.email]];
      if (request.phone) contact.push(["Téléphone", request.phone]);
      return {
        subject: `${request.kindLabel === "Essaim" ? "Essaim signalé" : "Nouvelle demande"} ${request.reference} — ${request.customerName}`,
        ...layout(identity, request.subject, [
          paragraph(`Nouvelle demande sur le site : ${request.subject}.`),
          { kind: "button", label: "Voir la demande", href: `${identity.siteUrl}/admin/demandes/${request.id}` },
          { kind: "details", rows: contact },
          ...recap,
          { kind: "quote", label: "Message", text: request.message },
          ...(photos ? [paragraph(`${photos} : visibles dans l’administration.`)] : []),
          paragraph("Le client a reçu un accusé de réception. Répondre à cet email écrit au client."),
        ], false),
      };
    }
    case "request_reply":
      return {
        subject: `Re : ${request.subject}`,
        ...layout(identity, (request.reply ?? "").slice(0, 120), [
          paragraph(request.reply ?? ""),
          { kind: "quote", label: `Votre message (${request.reference})`, text: request.message },
        ], true),
      };
  }
}

export type ReviewEmailContext = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  /** Produits de la commande (noms figés). */
  productNames: string[];
  /** Lien personnel de dépôt (demande d'avis). */
  link: string | null;
  linkDays: number;
  rating: number | null;
  comment: string | null;
  displayName: string | null;
  consent: boolean;
};

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

/** Emails des avis : demande, alerte « nouvel avis », remerciement. */
export function renderReviewEmail(template: ReviewTemplate, review: ReviewEmailContext, identity: EmailIdentity): RenderedEmail {
  switch (template) {
    case "review_request": {
      const what = review.productNames.length === 1 ? `« ${review.productNames[0]} »` : "votre commande";
      return {
        subject: `Votre avis sur ${review.productNames.length === 1 ? review.productNames[0] : `la commande ${review.orderNumber}`}`,
        ...layout(identity, "Deux minutes pour partager votre expérience ?", [
          paragraph(`Bonjour ${review.customerName},`),
          paragraph(`J’espère que tout se passe bien avec ${what}. Si vous avez deux minutes, votre avis m’aiderait beaucoup, et aiderait d’autres apiculteurs à faire leur choix.`),
          { kind: "button", label: "Donner mon avis", href: review.link ?? identity.siteUrl },
          paragraph(`Ce lien est personnel et valable ${review.linkDays} jours. Votre avis n’est publié qu’avec votre accord, sous le nom de votre choix.`),
        ], true),
      };
    }
    case "review_new_admin": {
      const rating = review.rating ?? 0;
      return {
        subject: `Nouvel avis ${stars(rating)} — ${review.displayName ?? review.customerName} (${review.orderNumber})`,
        ...layout(identity, review.comment?.slice(0, 120) ?? `${rating} sur 5`, [
          paragraph(`${review.customerName} a laissé un avis sur la commande ${review.orderNumber} : ${rating} sur 5.`),
          ...(review.comment ? [{ kind: "quote", label: `Avis de ${review.displayName ?? review.customerName}`, text: review.comment } satisfies Block] : []),
          paragraph(review.consent ? "Le client accepte qu’il soit publié. Il attend votre relecture." : "Le client ne souhaite pas qu’il soit publié : il reste visible dans l’administration seulement."),
          { kind: "button", label: "Modérer l’avis", href: `${identity.siteUrl}/admin/avis` },
        ], false),
      };
    }
    case "review_thanks":
      return {
        subject: "Merci pour votre avis !",
        ...layout(identity, "Votre avis est bien reçu.", [
          paragraph(`Bonjour ${review.customerName},`),
          paragraph(
            review.consent
              ? "Merci d’avoir pris le temps de donner votre avis ! Il sera publié sur le site après relecture."
              : "Merci d’avoir pris le temps de donner votre avis ! Comme vous l’avez demandé, il ne sera pas publié : il reste entre nous.",
          ),
          paragraph(contactLine(identity)),
        ], true),
      };
  }
}

export function renderTestEmail(identity: EmailIdentity): RenderedEmail {
  return {
    subject: `Email de test — ${identity.siteName}`,
    ...layout(identity, "L’envoi des emails fonctionne.", [
      paragraph("Bonjour,"),
      paragraph("Si vous lisez ce message, l’envoi des emails du site fonctionne : vos clients recevront les confirmations de leurs commandes."),
      paragraph("Pensez à vérifier qu’il n’est pas arrivé dans les indésirables."),
    ], true),
  };
}

/** Clé d'unicité : un même email d'une même étape n'est mis en file qu'une fois. */
export function orderEmailKey(template: EmailTemplate, orderId: string) {
  return `${template}:${orderId}`;
}
