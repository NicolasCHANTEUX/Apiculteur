import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="font-semibold tracking-tight text-stone-950">
          L&apos;atelier de l&apos;apiculteur
        </Link>
        <nav aria-label="Navigation principale">
          <Link
            href="/catalogue"
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950"
          >
            Catalogue
          </Link>
        </nav>
      </div>
    </header>
  );
}
