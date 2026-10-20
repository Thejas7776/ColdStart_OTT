
import Link from "next/link";

const movies = [
  { title: "Midnight Run", genre: "Action" },
  { title: "Beyond Earth", genre: "Sci-Fi" },
  { title: "Hidden Truth", genre: "Mystery" },
  { title: "Last Kingdom", genre: "Adventure" },
];

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            COLD<span className="text-lime-400">STAR</span>
          </Link>

          <Link
            href="/login"
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm transition hover:border-lime-400"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Welcome section */}
      <section className="px-6 py-24 text-center sm:py-32">
        <p className="text-sm font-semibold tracking-wider text-lime-400">
          WELCOME TO COLDSTAR OTT
        </p>

        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
          Entertainment, made simple.
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-zinc-400">
          Discover stories, explore new worlds, and find your next
          favourite movie.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-lime-400 px-6 py-3 font-semibold text-black transition hover:bg-lime-300"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="rounded-md border border-zinc-700 px-6 py-3 font-semibold transition hover:border-white"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Movie preview — text only */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Explore Movies</h2>
          <p className="mt-2 text-sm text-zinc-500">
            A preview of the stories waiting for you.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {movies.map((movie, index) => (
            <article
              key={movie.title}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition hover:border-lime-400/40"
            >
              <p className="text-xs font-medium text-lime-400">
                {String(index + 1).padStart(2, "0")} · {movie.genre}
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                {movie.title}
              </h3>
            </article>
          ))}
        </div>
      </section>

      {/* OpenPage branding card — above footer */}
      <section className="px-6 pb-10">
        <a
          href="https://openpage-lime.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group mx-auto block max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-lime-400/50 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">
            Discover Another Brand
          </p>

          <div className="mt-2 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">OpenPage</h2>

            <span className="text-2xl text-lime-400 transition group-hover:translate-x-1">
              →
            </span>
          </div>

          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Read stories, explore ideas, and discover something new.
          </p>

          <p className="mt-4 border-t border-white/10 pt-3 text-sm font-semibold text-lime-400">
            Visit OpenPage ↗
          </p>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-7 text-center text-sm text-zinc-500">
        <p>© 2026 ColdStar OTT. All rights reserved.</p>

        <p className="mt-3 text-xs">
          <Link
            href="/admin-login"
            className="transition hover:text-white"
          >
            Admin Login
          </Link>
        </p>
      </footer>
    </main>
  );
}
