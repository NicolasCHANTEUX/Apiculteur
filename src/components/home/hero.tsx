import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  MessageCircleIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/icons";
import { OwnerAvatar, buttonStyles, container } from "@/components/ui";
import { site } from "@/lib/site";

const trustItems = [
  { icon: ShieldIcon, label: "Élevage avec soin" },
  { icon: MessageCircleIcon, label: "Conseils personnalisés" },
  { icon: TruckIcon, label: "Livraison étudiée" },
];

export function Hero() {
  const years = new Date().getFullYear() - site.owner.since;

  return (
    // Le hero passe sous l'en-tete translucide, comme sur la maquette.
    <section className="relative -mt-[var(--header-height)] overflow-hidden bg-espresso">
      <Image
        src="/images/hero-apiculteur.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[65%_center]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#2b2418]/55 via-[#2b2418]/45 to-[#2b2418]/60"
        aria-hidden
      />

      <div
        className={`${container} relative pt-[calc(var(--header-height)+4.5rem)] pb-14`}
      >
        <div className="mx-auto max-w-[536px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-[13px] text-white backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-honey" aria-hidden />
            {site.seasonBanner}
          </span>

          <h1 className="mt-7 font-display text-[34px] leading-[1.1] font-semibold text-white sm:text-[44px]">
            Des essaims élevés avec soin, pour des apiculteurs accompagnés avec
            sérieux.
          </h1>

          <p className="mt-5 max-w-[400px] text-[15px] leading-[1.6] text-white/85">
            Apiculteur depuis {years} ans en Normandie, je produis et livre des
            essaims de qualité — avec un suivi personnalisé à chaque étape.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/catalogue" className={buttonStyles.primary}>
              Découvrir les essaims
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/contact" className={buttonStyles.ghostOnDark}>
              Me contacter
            </Link>
          </div>

          <div className="mt-7 flex items-center gap-3 border-t border-white/20 pt-5">
            <OwnerAvatar />
            <div>
              <p className="text-[13px] font-semibold text-white">
                {site.owner.fullName}
              </p>
              <p className="text-[11.5px] text-white/65">
                Apiculteur en Normandie depuis {site.owner.since} · Je réponds
                personnellement à chaque demande
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-black/30 backdrop-blur-sm">
        <ul
          className={`${container} flex flex-wrap gap-x-6 gap-y-2 py-[15px] text-[13px] text-white/80`}
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="size-3.5 text-honey" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
