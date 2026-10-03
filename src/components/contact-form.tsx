"use client";

import { useState, type FormEvent } from "react";
import { site } from "@/lib/site";

const subjects = [
  "Question sur un essaim",
  "Commande ou réservation",
  "Grande quantité",
  "Livraison ou retrait",
  "Autre demande",
];

const fieldClass =
  "w-full rounded-lg border border-line/80 bg-white px-3.5 text-[14px] text-ink outline-none transition focus:border-honey focus:ring-2 focus:ring-honey/15";

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] text-ink">
      {children}
    </label>
  );
}

// Pas encore d'envoi cote serveur (lot 5 de la roadmap) : le formulaire
// prepare un email dans la messagerie du visiteur plutot que de simuler un
// envoi.
export function ContactForm() {
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    const fullName = `${value("firstName")} ${value("lastName")}`.trim();
    const subject = `${value("subject") || "Contact"} — ${fullName}`;
    const body = [
      value("message"),
      "",
      "—",
      fullName,
      value("email"),
      value("phone") ? `Tél. : ${value("phone")}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)]"
    >
      <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Prénom *</Label>
          <input id="firstName" name="firstName" required autoComplete="given-name" className={`${fieldClass} h-[38px]`} />
        </div>
        <div>
          <Label htmlFor="lastName">Nom *</Label>
          <input id="lastName" name="lastName" required autoComplete="family-name" className={`${fieldClass} h-[38px]`} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="email">Email *</Label>
          <input id="email" name="email" type="email" required autoComplete="email" className={`${fieldClass} h-[38px]`} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={`${fieldClass} h-[38px]`} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="subject">Sujet</Label>
          <select id="subject" name="subject" defaultValue="" className={`${fieldClass} h-[38px]`}>
            <option value="">Choisir un sujet…</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="message">Message *</Label>
          <textarea id="message" name="message" required rows={5} className={`${fieldClass} min-h-[114px] resize-y py-2.5`} />
        </div>
      </div>

      <button
        type="submit"
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-lg bg-honey text-[15px] font-medium text-white shadow-[0_6px_16px_-6px_rgb(217_154_43/0.7)] transition hover:bg-honey-dark"
      >
        Envoyer mon message
      </button>

      {opened ? (
        <p className="mt-4 text-[13px] leading-[1.6] text-body" role="status">
          Votre messagerie s&apos;ouvre avec le message pré-rempli. Si rien ne se
          passe, écrivez directement à{" "}
          <a href={`mailto:${site.email}`} className="font-medium text-honey underline-offset-2 hover:underline">
            {site.email}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
