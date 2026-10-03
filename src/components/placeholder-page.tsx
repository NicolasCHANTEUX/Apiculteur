import { PageIntro } from "@/components/ui";

export function PlaceholderPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[768px] flex-1 px-6 pb-24">
      <PageIntro eyebrow={eyebrow} title={title} />
      <div className="rounded-2xl border border-line bg-white p-6 text-[14px] leading-[1.7] text-body shadow-[0_1px_3px_rgb(61_43_26/0.06)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
