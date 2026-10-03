import type { ReactNode } from "react";
import { PageIntro } from "@/components/ui";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-6 pb-24">
      <PageIntro eyebrow="Espace apiculteur" title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
