export default function AdminLoading() {
  return (
    <div aria-busy className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-line/60" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-line/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-2xl border border-line/60 bg-white" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-72 animate-pulse rounded-2xl border border-line/60 bg-white" />
        <div className="h-72 animate-pulse rounded-2xl border border-line/60 bg-white" />
      </div>
      <p className="sr-only" role="status">
        Chargement…
      </p>
    </div>
  );
}
