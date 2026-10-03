import {
  ClipboardListIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
} from "@/components/icons";
import { SectionHeading, container } from "@/components/ui";

const steps = [
  {
    title: "Vous choisissez votre essaim",
    description:
      "Parcourez le catalogue et sélectionnez la race et la quantité adaptées à votre projet. Des questions ? Je suis disponible avant même votre commande.",
    icon: ClipboardListIcon,
    tone: "bg-[#f5e9d2] text-honey",
  },
  {
    title: "Je vérifie votre besoin",
    description:
      "Pour les commandes importantes ou éloignées, j'étudie personnellement les conditions de livraison avant de confirmer. Rien n'est laissé au hasard.",
    icon: MessageCircleIcon,
    tone: "bg-[#eae9e0] text-sage",
  },
  {
    title: "Je prépare avec soin",
    description:
      "Chaque essaim est contrôlé, conditionné dans les meilleures conditions pour le transport. Vous êtes informé avant le départ.",
    icon: PackageIcon,
    tone: "bg-[#ece5dd] text-brown",
  },
  {
    title: "Livraison ou retrait",
    description:
      "La livraison est organisée en concertation avec vous selon votre situation. Retrait sur exploitation également possible.",
    icon: MapPinIcon,
    tone: "bg-[#f5e9d2] text-honey",
  },
];

export function ProcessSteps() {
  return (
    <section className="bg-cream py-20 sm:py-24">
      <div className={container}>
        <SectionHeading
          align="center"
          eyebrow="Le parcours"
          title="Comment ça se passe ?"
          subtitle={
            <span className="mx-auto block max-w-[350px]">
              Du premier contact à la livraison, chaque étape est suivie
              personnellement.
            </span>
          }
        />

        {/* Sur grand ecran, chaque etape (sauf la derniere) porte le trait
            qui la relie a la suivante et s'etire pour remplir l'espace. */}
        <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:flex lg:items-start">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            return (
              <li
                key={step.title}
                className={`lg:flex lg:items-start ${isLast ? "lg:flex-none" : "lg:flex-1"}`}
              >
                <div className="mx-auto max-w-[220px] text-center lg:w-[146px]">
                  <div
                    className={`relative mx-auto flex size-[74px] items-center justify-center rounded-full border-[3px] border-white shadow-[0_6px_16px_-8px_rgb(61_43_26/0.4)] ${step.tone}`}
                  >
                    <Icon className="size-6" />
                    <span className="absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-honey text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-[13px] leading-snug font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[11.5px] leading-[1.55] text-muted">
                    {step.description}
                  </p>
                </div>
                {isLast ? null : (
                  <span
                    className="mx-1.5 mt-[37px] hidden h-px flex-1 bg-honey/40 lg:block"
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
