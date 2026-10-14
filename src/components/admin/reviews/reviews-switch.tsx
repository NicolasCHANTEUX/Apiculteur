"use client";

import { setReviewsPublicAction } from "@/app/admin/avis/actions";
import { SettingSwitch } from "@/components/admin/setting-switch";

// Affichage des avis sur le site. Activer demande confirmation : seuls de
// vrais avis de clients doivent être montrés.
export function ReviewsSwitch({ visible, published }: { visible: boolean; published: number }) {
  return (
    <SettingSwitch
      checked={visible}
      action={setReviewsPublicAction}
      title="Avis sur le site"
      onLabel="Visibles par les visiteurs"
      offLabel="Masqués"
      ariaLabel="Afficher les avis clients sur le site"
      confirmOn={{
        title: "Afficher les avis sur le site ?",
        description: (
          <>
            La page « Avis clients », son lien dans le menu, la section de l’accueil et les notes des produits apparaîtront.{" "}
            {published === 0
              ? "Aucun avis n’est encore publié : la page Avis sera vide pour le moment."
              : `${published} avis publié${published > 1 ? "s" : ""} ser${published > 1 ? "ont" : "a"} visible${published > 1 ? "s" : ""}.`}{" "}
            N’affichez que de vrais avis de clients : les faux avis sont interdits.
          </>
        ),
        confirmLabel: "Afficher les avis",
      }}
    />
  );
}
