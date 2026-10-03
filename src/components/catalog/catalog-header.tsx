import { Eyebrow, container } from "@/components/ui";

export function CatalogHeader() {
  return (
    <div className="border-b border-line/60 bg-sand">
      <div className={`${container} py-12 sm:py-14`}>
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="mt-3 font-display text-[30px] leading-[1.24] font-medium text-ink sm:text-[34px]">
          Nos essaims
        </h1>
        <p className="mt-3 max-w-[620px] text-[15px] leading-[1.65] text-muted">
          Chaque essaim est élevé avec soin sur notre exploitation normande.
          Sélectionnez la race qui correspond à votre projet.
        </p>
      </div>
    </div>
  );
}
