
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#080b10] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">ColdStar OTT Admin</h1>
        <p className="mt-2 text-gray-400">
          Manage your movies and OpenPage blog.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/movies"
            className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-lime-400"
          >
            <h2 className="text-xl font-semibold">Manage Movies</h2>
            <p className="mt-2 text-sm text-gray-400">
              Manage your existing movie collection.
            </p>
          </Link>

          <Link
            href="/admin/blog"
            className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-lime-400"
          >
            <h2 className="text-xl font-semibold">Manage OpenPage Blog</h2>
            <p className="mt-2 text-sm text-gray-400">
              Manage blog articles and reader feedback.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
