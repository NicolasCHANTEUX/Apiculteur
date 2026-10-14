"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { submitContactRequestAction, type ContactRequestState } from "@/app/(site)/contact/actions";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CameraIcon,
  ClipboardListIcon,
  CloseIcon,
  HexagonIcon,
  InfoIcon,
  MessageCircleIcon,
  PackageIcon,
} from "@/components/icons";
import { inputClass } from "@/components/ui";
import { MAX_REQUEST_PHOTOS, MAX_REQUEST_PHOTO_BYTES } from "@/lib/images/limits";
import {
  MIN_MESSAGE_LENGTH,
  contactSubjects,
  requestKinds,
  swarmHeights,
  swarmSince,
  type RequestKind,
} from "@/lib/requests/form";

const initialState: ContactRequestState = { status: "idle", message: "", errors: {} };

const kindIcons = { contact: MessageCircleIcon, quote: ClipboardListIcon, swarm: HexagonIcon } as const;

const placeholders: Record<RequestKind, string> = {
  contact: "Votre question, votre projet, votre niveau en apiculture…",
  quote: "Votre projet : installation d’un rucher, renouvellement de colonies, contraintes de livraison…",
  swarm: "Où se trouve l’essaim (arbre, haie, cheminée…), sa taille approximative, comment y accéder…",
};

function Field({
  label,
  name,
  error,
  hint,
  optional = false,
  children,
  className = "",
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-muted"> (facultatif)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Photo = { id: string; file: File; url: string };

/**
 * Réduit une photo dans le navigateur (2 000 px, JPEG) : envoi rapide même
 * en 4G, et sous la limite du serveur. En cas d'échec (format inconnu du
 * navigateur), la photo part telle quelle et le serveur tranche.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1_500_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Formulaire de demande (CAHIER §12.1) : question, devis ou essaim à
// récupérer. Le serveur valide tout ; une clé d'envoi unique évite les
// doublons ; la saisie est conservée en cas d'erreur.
export function RequestForm({
  initialKind,
  initialSubject,
  initialMessage,
  initialQuantity,
  product,
  photosEnabled,
  privacyPublished,
}: {
  initialKind: RequestKind;
  initialSubject: string;
  initialMessage: string;
  initialQuantity: string;
  product: { slug: string; name: string; sku: string | null } | null;
  photosEnabled: boolean;
  /** Politique de confidentialité publiée (lien « En savoir plus »). */
  privacyPublished: boolean;
}) {
  const [state, action, pending] = useActionState(submitContactRequestAction, initialState);
  const [kind, setKind] = useState<RequestKind>(initialKind);
  const [linkedProduct, setLinkedProduct] = useState(product);
  const [messageLength, setMessageLength] = useState(initialMessage.trim().length);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const keyRef = useRef<string | null>(null);
  const photosRef = useRef(photos);
  // Une erreur disparaît dès que le visiteur corrige le champ, jusqu'au
  // prochain envoi.
  const [edited, setEdited] = useState<{ state: ContactRequestState; names: string[] }>({ state, names: [] });
  const editedNames = edited.state === state ? edited.names : [];
  const errors = Object.fromEntries(Object.entries(state.errors).filter(([name]) => !editedNames.includes(name)));
  const markEdited = (name: string) => {
    if (!state.errors[name] || editedNames.includes(name)) return;
    setEdited({ state, names: [...editedNames, name] });
  };
  const field = (name: string) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  // Après un refus du serveur, le premier champ à corriger reçoit le focus.
  useEffect(() => {
    if (state.status !== "error") return;
    const invalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
    (invalid ?? document.querySelector<HTMLElement>("#request-error"))?.focus();
  }, [state]);

  // Aperçus des photos libérés en quittant la page.
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  async function addPhotos(list: FileList | null) {
    if (!list?.length) return;
    setPhotoError("");
    const room = MAX_REQUEST_PHOTOS - photos.length;
    const chosen = [...list].slice(0, Math.max(0, room));
    if (list.length > room) setPhotoError(`${MAX_REQUEST_PHOTOS} photos au maximum : les suivantes n’ont pas été ajoutées.`);
    setPreparing(true);
    const ready: Photo[] = [];
    for (const original of chosen) {
      if (!original.type.startsWith("image/")) {
        setPhotoError("Seules les photos sont acceptées (JPG, PNG, WebP).");
        continue;
      }
      const file = await shrink(original);
      if (file.size > MAX_REQUEST_PHOTO_BYTES) {
        setPhotoError("Une photo dépasse 5 Mo, même réduite : choisissez-en une autre.");
        continue;
      }
      ready.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setPhotos((current) => [...current, ...ready].slice(0, MAX_REQUEST_PHOTOS));
    setPreparing(false);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((photo) => photo.id !== id);
    });
    setPhotoError("");
  }

  const subject = (contactSubjects as readonly string[]).includes(initialSubject) ? initialSubject : "";
  const remaining = MIN_MESSAGE_LENGTH - messageLength;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        keyRef.current ??= crypto.randomUUID();
        const formData = new FormData(event.currentTarget);
        formData.set("kind", kind);
        formData.set("submissionKey", keyRef.current);
        if (linkedProduct) formData.set("product", linkedProduct.slug);
        for (const photo of photos) formData.append("photos", photo.file);
        startTransition(() => action(formData));
      }}
      onChange={(event) => {
        const target = event.target as unknown as HTMLInputElement;
        markEdited(target.type === "file" ? "photos" : target.name);
      }}
      className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-6"
    >
      {state.status === "error" ? (
        <div id="request-error" tabIndex={-1} role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 outline-none">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="font-medium">{state.message}</p>
        </div>
      ) : null}

      <fieldset>
        <legend className="mb-2.5 text-[13.5px] font-medium text-ink">Votre demande concerne…</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {(Object.keys(requestKinds) as RequestKind[]).map((value) => {
            const Icon = kindIcons[value];
            const checked = kind === value;
            return (
              <label
                key={value}
                className={`relative flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition has-focus-visible:ring-2 has-focus-visible:ring-honey/40 sm:flex-col sm:items-start sm:gap-1 sm:py-3.5 ${
                  checked ? "border-honey bg-honey/8 ring-1 ring-honey/40" : "border-line hover:border-honey/50"
                }`}
              >
                <input type="radio" name="kind-choice" value={value} checked={checked} onChange={() => setKind(value)} className="sr-only" />
                <Icon className={`size-5 shrink-0 ${checked ? "text-honey-dark" : "text-honey"}`} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">{requestKinds[value].label}</span>
                  <span className="block text-[12px] leading-snug text-muted">{requestKinds[value].hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {linkedProduct ? (
        <p className="flex items-center gap-2.5 rounded-xl bg-sand/70 px-3.5 py-2.5 text-[13px] text-body">
          <PackageIcon className="size-4 shrink-0 text-honey" />
          <span className="min-w-0 flex-1">
            À propos de <span className="font-medium text-ink">{linkedProduct.name}</span>
            {linkedProduct.sku ? <span className="text-muted"> (réf. {linkedProduct.sku})</span> : null}
          </span>
          <button
            type="button"
            onClick={() => setLinkedProduct(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-white hover:text-ink"
            aria-label="Ne plus lier ce produit à ma demande"
          >
            <CloseIcon className="size-3.5" />
          </button>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" name="name" error={errors.name} className="sm:col-span-2">
          <input {...field("name")} autoComplete="name" className={`${inputClass} h-11`} />
        </Field>
        <Field label="Email" name="email" error={errors.email}>
          <input {...field("email")} type="email" autoComplete="email" className={`${inputClass} h-11`} />
        </Field>
        <Field label="Téléphone" name="phone" error={errors.phone} optional={kind !== "swarm"}>
          <input {...field("phone")} type="tel" autoComplete="tel" className={`${inputClass} h-11`} />
        </Field>
      </div>

      {kind === "contact" ? (
        <Field label="Sujet" name="subject" error={errors.subject}>
          <select {...field("subject")} defaultValue={subject} className={`${inputClass} h-11`}>
            <option value="">Choisir un sujet…</option>
            {contactSubjects.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
      ) : null}

      {kind === "quote" ? (
        <div className="grid gap-4 rounded-xl border border-line/80 bg-cream/50 p-4 sm:grid-cols-2">
          <Field label="Quantité souhaitée" name="quantity" error={errors.quantity}>
            <input {...field("quantity")} inputMode="numeric" defaultValue={initialQuantity} placeholder="Ex. 20" className={`${inputClass} h-11`} />
          </Field>
          <Field label="Race ou produit" name="variety" error={errors.variety} optional>
            <input {...field("variety")} defaultValue={linkedProduct?.name ?? ""} placeholder="Buckfast, noire locale…" className={`${inputClass} h-11`} />
          </Field>
          <Field label="Période souhaitée" name="period" error={errors.period} optional>
            <input {...field("period")} placeholder="Ex. avril 2027" className={`${inputClass} h-11`} />
          </Field>
          <Field label="Lieu de retrait ou de livraison" name="location" error={errors.location} optional>
            <input {...field("location")} placeholder="Commune ou code postal" className={`${inputClass} h-11`} />
          </Field>
          <Field label="Budget indicatif" name="budget" error={errors.budget} optional>
            <input {...field("budget")} className={`${inputClass} h-11`} />
          </Field>
          <Field label="Exploitation ou entreprise" name="company" error={errors.company} optional>
            <input {...field("company")} autoComplete="organization" className={`${inputClass} h-11`} />
          </Field>
        </div>
      ) : null}

      {kind === "swarm" ? (
        <div className="space-y-4 rounded-xl border border-line/80 bg-cream/50 p-4">
          <p className="flex gap-2.5 text-[13px] leading-[1.55] text-body">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-honey" />
            Un essaim qui vient de se poser est en général calme. Gardez vos distances, ne l’aspergez pas et n’essayez pas de le
            déplacer : je vous rappelle au plus vite.
          </p>
          <Field label="Où se trouve l’essaim ?" name="location" error={errors.location} hint="Adresse, ou au moins la commune.">
            <input {...field("location")} autoComplete="street-address" className={`${inputClass} h-11`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="À quelle hauteur ?" name="height" error={errors.height}>
              <select {...field("height")} defaultValue="unknown" className={`${inputClass} h-11`}>
                {Object.entries(swarmHeights).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Depuis quand ?" name="since" error={errors.since}>
              <select {...field("since")} defaultValue="today" className={`${inputClass} h-11`}>
                {Object.entries(swarmSince).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      ) : null}

      <Field
        label="Message"
        name="message"
        error={errors.message}
        hint={remaining > 0 ? `Encore ${remaining} caractère${remaining > 1 ? "s" : ""} au moins.` : undefined}
      >
        <textarea
          {...field("message")}
          rows={initialMessage ? 10 : 5}
          maxLength={5000}
          defaultValue={initialMessage}
          placeholder={placeholders[kind]}
          onChange={(event) => setMessageLength(event.target.value.trim().length)}
          className={`${inputClass} min-h-[120px] resize-y py-2.5`}
        />
      </Field>

      {photosEnabled ? (
        <div>
          <p className="mb-1.5 text-[13.5px] font-medium text-ink">
            Photos <span className="font-normal text-muted">(facultatif, {MAX_REQUEST_PHOTOS} au maximum)</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative size-20 overflow-hidden rounded-lg border border-line bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-espresso/80 text-white transition hover:bg-espresso"
                  aria-label={`Retirer la photo ${index + 1}`}
                >
                  <CloseIcon className="size-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_REQUEST_PHOTOS ? (
              <label
                className={`flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[11.5px] transition has-focus-visible:ring-2 has-focus-visible:ring-honey/40 ${
                  errors.photos || photoError ? "border-red-300 text-red-700" : "border-parchment text-muted hover:border-honey hover:text-honey-dark"
                }`}
              >
                <CameraIcon className="size-5" />
                {preparing ? "Préparation…" : "Ajouter"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={preparing}
                  aria-invalid={errors.photos ? true : undefined}
                  aria-describedby={errors.photos || photoError ? "photos-error" : "photos-hint"}
                  onChange={(event) => {
                    void addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            ) : null}
          </div>
          {errors.photos || photoError ? (
            <p id="photos-error" className="mt-1.5 text-[12.5px] font-medium text-red-700">
              {errors.photos ?? photoError}
            </p>
          ) : (
            <p id="photos-hint" className="mt-1.5 text-[12.5px] text-muted">
              {kind === "swarm" ? "Une photo de l’essaim et de son emplacement m’aide beaucoup." : "Utile pour montrer une ruche, un emplacement…"}
            </p>
          )}
        </div>
      ) : null}

      <div>
        <label className="flex items-start gap-2.5 text-[13px] leading-[1.55] text-body">
          <input
            type="checkbox"
            name="consent"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-0.5 size-4 shrink-0 rounded border-line accent-honey"
          />
          <span>
            J’accepte que ces informations servent uniquement à répondre à ma demande.{" "}
            {privacyPublished ? (
              <Link href="/confidentialite" className="font-medium text-honey-dark underline-offset-2 hover:underline">
                En savoir plus
              </Link>
            ) : null}
          </span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="mt-1.5 text-[12.5px] font-medium text-red-700">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {/* Champ piège pour les robots, invisible pour les visiteurs. */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending || preparing}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-honey text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(217_154_43/0.8)] transition hover:bg-honey-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Envoi en cours…" : kind === "swarm" ? "Signaler l’essaim" : kind === "quote" ? "Demander un devis" : "Envoyer mon message"}
        {pending ? null : <ArrowRightIcon className="size-4" />}
      </button>
    </form>
  );
}
