import Link from "next/link";
import {
  ClockIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "@/components/icons";
import { OwnerAvatar, buttonStyles } from "@/components/ui";
import { site } from "@/lib/site";

export function ContactCta() {
  return (
    <section id="contact" className="bg-brown py-16">
      <div className="mx-auto grid w-full max-w-[880px] items-center gap-12 px-6 md:grid-cols-[minmax(0,386px)_1fr]">
        <div>
          <h2 className="font-display text-[30px] leading-[1.18] font-medium text-white sm:text-[34px]">
            Une question avant de commander ?
          </h2>
          <p className="mt-4 text-[13px] leading-[1.65] text-parchment">
            Je réponds à chaque message personnellement, généralement sous 24h.
            Que vous débutiez en apiculture ou que vous gériez déjà un rucher
            professionnel, je prends le temps de vous répondre sérieusement.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className={buttonStyles.primary}>
              Écrire à {site.owner.firstName}
              <MessageCircleIcon className="size-4" />
            </Link>
            <Link href="/faq" className={buttonStyles.ghostOnDark}>
              Consulter la FAQ
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-6">
          <div className="flex items-center gap-3">
            <OwnerAvatar className="size-[52px] text-[19px]" />
            <div>
              <p className="text-[14px] font-semibold text-white">
                {site.owner.fullName}
              </p>
              <p className="text-[11.5px] text-parchment/80">
                Apiculteur · Normandie
              </p>
            </div>
          </div>
          <p className="mt-5 text-[13px] leading-[1.65] text-parchment italic">
            “N&apos;hésitez pas à me décrire votre projet — même si vous
            débutez. J&apos;aime prendre le temps de bien orienter chaque
            personne.”
          </p>
          <ul className="mt-4 space-y-1.5 text-[11px] text-parchment">
            <li>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-2.5 transition hover:text-white"
              >
                <MailIcon className="size-3" />
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.phoneHref}
                className="inline-flex items-center gap-2.5 transition hover:text-white"
              >
                <PhoneIcon className="size-3" />
                {site.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <ClockIcon className="size-3" />
              Réponse sous 24h généralement
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
