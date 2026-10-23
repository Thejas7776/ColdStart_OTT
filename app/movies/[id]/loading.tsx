export default function MovieDetailsLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-[#080b10] px-6 py-12 text-white sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[384px_1fr] md:gap-16">
        <div className="aspect-video w-full rounded-3xl border border-white/10 bg-white/[0.06]" />
        <div className="space-y-5">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="h-12 w-3/4 rounded bg-white/10" />
          <div className="h-8 w-40 rounded bg-white/10" />
          <div className="h-24 max-w-xl rounded bg-white/[0.06]" />
        </div>
      </div>
    </main>
  );
}
