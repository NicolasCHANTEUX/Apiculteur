import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-[14px] font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <SiteHeader />
      <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
