import type { Metadata } from "next";
import Image from "next/image";
import { LeafIcon } from "@/components/icons";
import { Eyebrow, container } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "À propos",
  description: `${site.owner.fullName}, apiculteur en Normandie depuis ${site.owner.since} : parcours et façon de travailler.`,
};

const values = [
  {
    title: "Accompagnement",
    description:
      "Je réponds à chaque question avant et après votre commande. L'apiculture s'apprend ensemble.",
  },
  {
    title: "Transparence",
    description:
      "Je vous dis clairement ce que je peux faire et ce que je ne peux pas. Pas de promesses non tenues.",
  },
  {
    title: "Passion",
    description:
      "Chaque essaim que je prépare est traité avec le même soin que si c'était pour mon propre rucher.",
  },
];

const photoClass =
  "w-full rounded-2xl object-cover shadow-[0_24px_48px_-20px_rgb(61_43_26/0.5)]";

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="relative flex h-[260px] items-end overflow-hidden bg-espresso sm:h-[300px]">
        <Image
          src="/images/apiculteurs-cadres.jpg"
          alt="Deux apiculteurs en combinaison tenant des cadres de cire"
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#2b2418]/10 via-[#2b2418]/30 to-[#2b2418]/65"
          aria-hidden
        />
        <h1
          className={`${container} relative pb-9 text-center font-display text-[34px] leading-tight font-medium text-white sm:pb-11 sm:text-[44px]`}
        >
          Une passion devenue métier
        </h1>
      </section>

      <div className={`${container} py-20 sm:py-[88px]`}>
        <section className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <Eyebrow>Mon parcours</Eyebrow>
            <h2 className="mt-3 font-display text-[26px] leading-[1.25] font-medium text-ink sm:text-[28px]">
              De trois ruches à deux cents colonies
            </h2>
            <div className="mt-5 space-y-4 text-[13px] leading-[1.65] text-body">
              <p>
                Tout a commencé en {site.owner.since}, avec trois ruches
                installées dans le jardin familial en Normandie. Je ne savais
                pas encore que cette curiosité deviendrait le centre de ma vie
                professionnelle.
              </p>
              <p>
                Après quelques années d&apos;apprentissage auprès
                d&apos;apiculteurs expérimentés de la région, j&apos;ai
                progressivement développé mon rucher. Aujourd&apos;hui, je gère
                200 colonies sur plusieurs sites, tous soigneusement choisis
                pour la richesse de leur environnement floral.
              </p>
              <p>
                L&apos;élevage d&apos;essaims est devenu ma spécialité. Chaque
                printemps, je prépare des centaines d&apos;essaims pour des
                apiculteurs de toute la France — débutants ou confirmés.
              </p>
            </div>
          </div>
          <Image
            src="/images/apiculteur-rucher.jpg"
            alt="Apiculteur inspectant un cadre devant ses ruches"
            width={800}
            height={700}
            sizes="(min-width: 768px) 480px, 100vw"
            className={`${photoClass} aspect-[480/370]`}
          />
        </section>

        <figure className="mt-16 max-w-[640px] border-l-[3px] border-honey py-1 pl-8">
          <blockquote className="font-display text-[19px] leading-[1.55] text-ink italic">
            “L&apos;apiculture m&apos;a appris la patience, l&apos;observation
            et le respect. Quand on travaille avec des abeilles, on ne peut pas
            tricher — elles le savent avant vous.”
          </blockquote>
          <figcaption className="mt-4 text-[13px] text-muted">
            — {site.owner.fullName}, apiculteur
          </figcaption>
        </figure>

        <section className="mt-16 grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Image
            src="/images/hero-apiculteur.jpg"
            alt="Apiculteur portant un cadre de ruche dans une prairie"
            width={1600}
            height={900}
            sizes="(min-width: 768px) 480px, 100vw"
            className={`${photoClass} aspect-[4/3] object-[70%_center]`}
          />
          <div>
            <Eyebrow>Ma façon de travailler</Eyebrow>
            <h2 className="mt-3 font-display text-[22px] leading-[1.3] font-medium text-ink">
              Un élevage raisonné, une sélection rigoureuse
            </h2>
            <div className="mt-5 space-y-3.5 text-[13px] leading-[1.65] text-body">
              <p>
                Je sélectionne mes colonies pour trois critères principaux : la
                douceur, la productivité et la résistance aux maladies. Ce
                travail de sélection prend plusieurs années par souche.
              </p>
              <p>
                Chaque essaim que je vends est issu de mes propres colonies. Je
                ne réceptionne pas d&apos;essaims extérieurs pour les revendre —
                tout est produit sur mon exploitation, sous ma surveillance.
              </p>
              <p>
                Je traite mes colonies contre le varroa de façon raisonnée, en
                évitant les traitements chimiques lorsque c&apos;est possible.
              </p>
            </div>
          </div>
        </section>

        <ul className="mt-16 grid gap-6 md:grid-cols-3 md:gap-[30px]">
          {values.map((value) => (
            <li
              key={value.title}
              className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)]"
            >
              <span className="flex size-[37px] items-center justify-center rounded-lg bg-honey/15 text-honey">
                <LeafIcon className="size-4" />
              </span>
              <h3 className="mt-5 font-display text-[15px] font-semibold text-ink">
                {value.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-muted">
                {value.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
