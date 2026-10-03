import type { Metadata } from "next";
import { ChevronDownIcon } from "@/components/icons";
import { PageIntro, container } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Réservation, disponibilités, livraison, paiement, factures et avis : les réponses aux questions fréquentes.",
};

// Questions de la maquette. Les reponses (absentes de la maquette, qui ne
// montre que les questions repliees) suivent le cahier des charges et sont
// a valider par l'apiculteur.
const faq = [
  {
    question: "Comment réserver un essaim ?",
    answer:
      "Choisissez votre essaim dans le catalogue, indiquez la quantité souhaitée et envoyez votre demande de commande. Pour les essaims proposés sur réservation, votre demande vous garantit une place pour la saison : je vous recontacte pour confirmer les détails.",
  },
  {
    question: "Quand les essaims sont-ils disponibles ?",
    answer:
      "Les essaims sont prêts au printemps, selon la météo et le développement des colonies. La disponibilité de chaque essaim est indiquée sur sa fiche, et les réservations pour la saison suivante ouvrent en avance.",
  },
  {
    question: "Peut-on commander plusieurs dizaines d'essaims ?",
    answer:
      "Oui. Les grandes quantités bénéficient de tarifs dégressifs. Afin de garantir des essaims de qualité et une livraison adaptée, ces demandes sont d'abord étudiées personnellement avant validation définitive.",
  },
  {
    question: "Livrez-vous partout en France ?",
    answer:
      "Le retrait sur l'exploitation en Normandie est toujours possible. La livraison dépend de la distance et du nombre d'essaims : au-delà d'une certaine distance, elle est organisée au cas par cas, en concertation avec vous.",
  },
  {
    question: "Comment sont calculés les frais de livraison ?",
    answer:
      "Ils dépendent de la distance et de la quantité commandée. Ils vous sont indiqués lors de la demande lorsque c'est possible, ou confirmés après étude pour les livraisons éloignées et les commandes importantes.",
  },
  {
    question: "Pourquoi certaines commandes nécessitent-elles une validation ?",
    answer:
      "Lorsqu'une commande concerne une quantité importante ou une distance de livraison élevée, je l'étudie avant de la confirmer pour garantir une livraison sérieuse et adaptée. Aucun paiement ne vous est demandé avant cette validation.",
  },
  {
    question: "Comment se passe le paiement ?",
    answer:
      "Selon la commande : par virement, à la récupération des essaims ou sur facture. Les modalités vous sont confirmées avec votre commande, et aucun paiement immédiat n'est demandé si celle-ci doit d'abord être validée.",
  },
  {
    question: "Quand vais-je recevoir ma facture ?",
    answer:
      "La facture vous est envoyée par email une fois votre commande validée. Vous pouvez aussi la demander à tout moment par message.",
  },
  {
    question: "Comment laisser un avis ?",
    answer:
      "Après votre commande, vous recevez un email avec un lien personnel et sécurisé pour donner votre avis, sans créer de compte. Votre avis n'est publié qu'avec votre accord.",
  },
];

export default function FaqPage() {
  return (
    <main className={`${container} flex-1 pb-24`}>
      <PageIntro
        eyebrow="Questions fréquentes"
        title="FAQ"
        subtitle="Si vous ne trouvez pas la réponse, n'hésitez pas à me contacter directement."
      />

      <div className="space-y-3">
        {faq.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-line bg-white shadow-[0_1px_3px_rgb(61_43_26/0.06)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-[23px] py-[15px] text-[15px] leading-[1.4] text-ink">
              {item.question}
              <ChevronDownIcon className="size-4 shrink-0 text-honey transition group-open:rotate-180" />
            </summary>
            <p className="px-[23px] pb-5 text-[14px] leading-[1.7] text-body">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </main>
  );
}
