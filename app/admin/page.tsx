
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin-login");
  }

  return (
    <main className="min-h-screen bg-[#080b10] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-lime-400">
          ColdStar OTT
        </p>

        <h1 className="text-3xl font-bold md:text-4xl">
          Admin Dashboard
        </h1>

        <p className="mt-3 text-gray-400">
          Manage ColdStar OTT and OpenPage from your admin dashboard.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Link
            href="/admin/movies"
            className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-6 transition hover:bg-lime-400/20"
          >
            <h2 className="text-xl font-bold text-lime-300">
              Manage Movies
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Add, open, edit and delete movies. Manage YouTube trailers
              and uploaded video files.
            </p>
            <p className="mt-5 font-semibold text-lime-300">
              Open Movie Manager →
            </p>
          </Link>

          <Link
            href="/home"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <h2 className="text-xl font-bold">
              View OTT Homepage
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Check how movies appear to viewers.
            </p>
            <p className="mt-5 font-semibold">
              Open Homepage →
            </p>
          </Link>

          <a
            href="https://openpage-lime.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-6 transition hover:bg-sky-400/20"
          >
            <h2 className="text-xl font-bold text-sky-300">
              Manage OpenPage
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Open your blog administration to manage articles
              and publishing.
            </p>
            <p className="mt-5 font-semibold text-sky-300">
              Open OpenPage Admin ↗
            </p>
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Main Website
          </Link>

          <a
            href="https://openpage-lime.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Visit OpenPage ↗
          </a>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

