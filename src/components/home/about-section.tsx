import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow, OwnerAvatar, buttonStyles, container } from "@/components/ui";
import { site } from "@/lib/site";

export function AboutSection() {
  const years = new Date().getFullYear() - site.owner.since;
  const stats = [
    { value: "200", label: "colonies actives" },
    { value: `${years} ans`, label: "d'expérience" },
    { value: "8 races", label: "travaillées" },
    { value: "France", label: "entière" },
  ];

  return (
    <section id="a-propos" className="bg-cream py-20 sm:py-[88px]">
      <div
        className={`${container} grid items-center gap-14 md:grid-cols-[minmax(0,478px)_1fr] md:gap-[67px]`}
      >
        <div className="relative mr-6 mb-6 md:mr-0">
          <Image
            src="/images/apiculteur-rucher.jpg"
            alt="Apiculteur en combinaison inspectant un cadre devant ses ruches"
            width={800}
            height={700}
            sizes="(min-width: 768px) 478px, 100vw"
            className="aspect-[478/420] w-full rounded-2xl object-cover shadow-[0_24px_48px_-20px_rgb(61_43_26/0.55)]"
          />
          <figure className="absolute -right-6 -bottom-6 w-[204px] rounded-xl bg-white p-4 shadow-[0_16px_36px_-12px_rgb(61_43_26/0.35)] md:-right-[30px]">
            <blockquote className="font-display text-[13px] leading-[1.4] text-ink italic">
              “Je préfère accompagner chaque client sérieusement plutôt que
              vendre à tout prix.”
            </blockquote>
            <figcaption className="mt-2.5 flex items-center gap-2 text-[11px] text-muted">
              <OwnerAvatar className="size-5 text-[10px]" />
              {site.owner.firstName}
            </figcaption>
          </figure>
        </div>

        <div>
          <Eyebrow>À propos</Eyebrow>
          <h2 className="mt-3 font-display text-[30px] leading-[1.24] font-medium text-ink sm:text-[34px]">
            Avant les ruches, il y a surtout une passion.
          </h2>
          <p className="mt-5 text-[13px] leading-[1.65] text-body">
            Je suis {site.owner.fullName}, apiculteur en Normandie depuis{" "}
            {site.owner.since}. Ce qui a commencé avec 3 ruches dans mon jardin
            est devenu une exploitation de 200 colonies, entièrement gérée avec
            méthode et respect.
          </p>
          <p className="mt-4 text-[13px] leading-[1.65] text-body">
            Quand vous commandez chez moi, je réponds personnellement à vos
            questions — avant, pendant et après la livraison. Pas un
            formulaire, pas un robot : moi.
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-x-10 gap-y-1.5">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-3">
                <dt className="order-2 text-[11.5px] text-muted">{stat.label}</dt>
                <dd className="order-1 font-display text-[23px] font-semibold text-honey">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <Link href="/a-propos" className={`${buttonStyles.link} mt-6`}>
            Découvrir mon histoire
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
