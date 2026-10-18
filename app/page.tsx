
import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b10] px-6 py-12 text-white">
      <div className="w-full max-w-lg text-center">
        <div className="mb-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-lime-400 text-4xl font-black text-black shadow-lg shadow-lime-400/20">
            C
          </div>

          <h1 className="text-5xl font-black tracking-tight">
            Cold<span className="text-lime-400">Star</span>
          </h1>

          <p className="mt-3 text-sm tracking-[0.3em] text-gray-400">
            YOUR ENTERTAINMENT UNIVERSE
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl sm:p-9">
          <h2 className="text-2xl font-bold">Welcome to ColdStar</h2>

          <p className="mt-3 mb-8 text-sm leading-6 text-gray-400">
            Discover movies, explore stories, and enjoy entertainment
            made for you.
          </p>

          <div className="space-y-4">
            <Link
              href="/signup"
              className="block w-full rounded-xl bg-lime-400 px-5 py-4 font-bold text-black transition hover:bg-lime-300"
            >
              Create User Account
            </Link>

            <Link
              href="/login"
              className="block w-full rounded-xl border border-white/15 px-5 py-4 font-semibold transition hover:border-lime-400 hover:text-lime-400"
            >
              User Login
            </Link>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-500">ADMIN ACCESS</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Link
              href="/admin-login"
              className="block w-full rounded-xl bg-white/5 px-5 py-4 font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Admin Login
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-600">
          © 2026 ColdStar OTT. All rights reserved.
        </p>
      </div>
    </main>
  );
}
