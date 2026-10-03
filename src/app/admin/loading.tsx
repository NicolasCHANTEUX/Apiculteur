export default function AdminLoading() {
  return (
    <div aria-busy className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-line/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[108px] animate-pulse rounded-xl border border-line/60 bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-line/60 bg-white" />
      <p className="sr-only">Chargement…</p>
    </div>
  );
}
