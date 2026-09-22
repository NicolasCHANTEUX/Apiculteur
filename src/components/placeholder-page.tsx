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
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      <div className="mt-6 leading-8 text-ink-muted">{children}</div>
    </main>
  );
}
