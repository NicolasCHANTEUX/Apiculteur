"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ChevronDownIcon, CircleCheckIcon, CopyIcon, SearchIcon } from "@/components/icons";
import { faqThemes, highlightParts, searchFaq, type FaqItem, type FaqTheme } from "@/lib/faq";

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-honey/25 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

// FAQ : recherche (sans accents, surlignée), thèmes, lien partageable par
// question (/faq#ancre, ouverte à l'arrivée) et ouverture animée en CSS.
// Les <details> restent natifs : la page fonctionne sans JavaScript.
export function FaqBrowser({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const results = searchFaq(items, query);
  const themes = (Object.keys(faqThemes) as FaqTheme[])
    .map((theme) => ({ theme, items: results.filter((item) => item.theme === theme) }))
    .filter((group) => group.items.length > 0);

  const details = () => Array.from(listRef.current?.querySelectorAll<HTMLDetailsElement>("details") ?? []);

  // Question ciblée par l'ancre de l'URL : ouverte et amenée à l'écran.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);
      // Question masquée par une recherche en cours : on l'efface d'abord.
      if (!target && items.some((item) => item.id === id)) {
        setQuery("");
        window.setTimeout(openFromHash, 50);
        return;
      }
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
        target.scrollIntoView({ block: "center" });
        target.querySelector("summary")?.focus({ preventScroll: true });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [items]);

  // Pendant une recherche, les réponses trouvées sont dépliées.
  useEffect(() => {
    if (query.trim().length > 1) for (const element of details()) element.open = true;
  }, [query]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const allOpen = () => details().length > 0 && details().every((element) => element.open);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
      <aside className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
        <nav aria-label="Thèmes de la FAQ">
          <p className="hidden text-[11.5px] font-semibold tracking-[0.08em] text-muted uppercase lg:block">Thèmes</p>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:mt-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {(Object.keys(faqThemes) as FaqTheme[]).map((theme) => {
              const count = results.filter((item) => item.theme === theme).length;
              return (
                <li key={theme} className="shrink-0">
                  <a
                    href={`#theme-${theme}`}
                    aria-disabled={count === 0 || undefined}
                    className={`flex items-center justify-between gap-3 rounded-full border px-3.5 py-2 text-[13.5px] whitespace-nowrap transition lg:rounded-lg lg:border-0 lg:px-3 ${
                      count === 0
                        ? "pointer-events-none border-line/60 text-muted/60"
                        : "border-line bg-white text-body hover:border-honey/50 hover:text-ink lg:bg-transparent lg:hover:bg-honey/8"
                    }`}
                  >
                    {faqThemes[theme]}
                    <span className="text-[12px] text-muted tabular-nums">{count}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Rechercher dans la FAQ</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Livraison, paiement, réservation…"
              className="h-12 w-full rounded-full border border-line bg-white pr-4 pl-11 text-[16px] text-ink shadow-[0_1px_3px_rgb(61_43_26/0.05)] outline-none transition placeholder:text-muted focus:border-honey focus:ring-3 focus:ring-honey/15 sm:text-[14.5px]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const open = !expanded;
              for (const element of details()) element.open = open;
            }}
            className="h-12 rounded-full px-4 text-[13.5px] font-medium text-honey-dark transition hover:bg-honey/10"
          >
            {expanded ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-muted" aria-live="polite">
          {query.trim().length > 1
            ? `${results.length} question${results.length > 1 ? "s" : ""} pour « ${query.trim()} »`
            : `${items.length} questions`}
        </p>

        <div ref={listRef} className="mt-6 space-y-10">
          {themes.map(({ theme, items: group }) => (
            <section key={theme} id={`theme-${theme}`} aria-labelledby={`theme-${theme}-title`} className="scroll-mt-28">
              <h2 id={`theme-${theme}-title`} className="font-display text-[22px] font-medium text-ink">
                {faqThemes[theme]}
              </h2>
              <div className="mt-4 space-y-3">
                {group.map((item) => (
                  <details
                    key={item.id}
                    id={item.id}
                    onToggle={(event) => {
                      setExpanded(allOpen());
                      if (event.currentTarget.open && query.trim().length < 2) {
                        window.history.replaceState(null, "", `#${item.id}`);
                      }
                    }}
                    className="faq-item group scroll-mt-28 rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgb(61_43_26/0.06)] transition-[border-color,box-shadow] open:border-honey/40 open:shadow-[0_14px_32px_-22px_rgb(61_43_26/0.45)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-4 text-[15.5px] leading-[1.4] text-ink outline-none focus-visible:ring-2 focus-visible:ring-honey/40">
                      <span>
                        <Highlight text={item.question} query={query} />
                      </span>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-honey/10 text-honey transition duration-300 group-open:rotate-180 group-open:bg-honey group-open:text-white">
                        <ChevronDownIcon className="size-4" />
                      </span>
                    </summary>
                    <div className="px-6 pb-5">
                      <p className="max-w-[640px] text-[14.5px] leading-[1.75] text-body">
                        <Highlight text={item.answer} query={query} />
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                        {item.link ? (
                          <Link href={item.link.href} className="inline-flex items-center gap-1.5 font-semibold text-honey transition hover:text-honey-dark">
                            {item.link.label}
                            <ArrowRightIcon className="size-3.5" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${window.location.origin}/faq#${item.id}`);
                              setCopied(item.id);
                            } catch {
                              window.location.hash = item.id;
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-muted transition hover:text-ink"
                        >
                          {copied === item.id ? (
                            <>
                              <CircleCheckIcon className="size-3.5 text-sage" /> Lien copié
                            </>
                          ) : (
                            <>
                              <CopyIcon className="size-3.5" /> Copier le lien
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          {results.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-honey/12 text-honey">
                <SearchIcon className="size-6" />
              </span>
              <p className="mt-4 font-display text-[20px] font-semibold text-ink">Aucune question ne correspond</p>
              <p className="mt-1 text-[13.5px] text-muted">Essayez un autre mot, ou posez-moi directement votre question.</p>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-honey px-5 text-[14px] font-semibold text-white transition hover:bg-honey-dark"
              >
                Poser ma question
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
