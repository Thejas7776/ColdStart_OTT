
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Movie = {
  id: string | number;
  title: string;
  description?: string | null;
  genre?: string | null;
  release_year?: number | null;
  rating?: number | string | null;
  poster_url?: string | null;
  poster_display_url?: string | null;
  emoji?: string | null;
};

async function getPosterUrl(path: string | null | undefined) {
  if (!path) return null;

  // Direct URLs and paths inside the public folder.
  if (
    path.startsWith("https://") ||
    path.startsWith("http://") ||
    path.startsWith("/")
  ) {
    return path;
  }

  // Generate a temporary URL for a poster in Supabase Storage.
  const { data, error } = await supabase.storage
    .from("movie-posters")
    .createSignedUrl(path, 3600);

  if (error) {
    console.error("Could not load poster:", path, error.message);
    return null;
  }

  return data.signedUrl;
}

export default function HomePage() {
  const router = useRouter();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMovies() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        // Check the existing admin role.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        setIsAdmin(!profileError && profile?.role === "admin");
        setCheckingUser(false);

        // Load movie records.
        const { data, error: moviesError } = await supabase
          .from("movies")
          .select("*")
          .order("created_at", { ascending: false });

        if (moviesError) {
          throw new Error(moviesError.message);
        }

        const movieList = (data ?? []) as Movie[];

        // Load each movie's poster.
        const moviesWithPosters = await Promise.all(
          movieList.map(async (movie) => ({
            ...movie,
            poster_display_url: await getPosterUrl(movie.poster_url),
          }))
        );

        if (!cancelled) {
          setMovies(moviesWithPosters);
        }
      } catch (err) {
        console.error("Loading movies failed:", err);

        if (!cancelled) {
          setError("Unable to load movies. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingUser(false);
        }
      }
    }

    loadMovies();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError("Unable to log out. Please try again.");
      return;
    }

    window.location.replace("/");
  }

  const query = search.trim().toLowerCase();

  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(query) ||
      (movie.genre ?? "").toLowerCase().includes(query)
  );

  return (
    <main className="min-h-screen bg-[#080b10] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-2xl font-black tracking-tight"
          >
            COLD<span className="text-lime-400">STAR</span>
          </button>

          <nav className="hidden items-center gap-5 md:flex">
            <Link
              href="/home"
              className="text-sm transition hover:text-lime-400"
            >
              Home
            </Link>

            {isAdmin && !checkingUser && (
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={adminMenuOpen}
                  onClick={() => setAdminMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
                >
                  Admin Tools
                  <span aria-hidden="true">
                    {adminMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

                {adminMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#121720] p-2 shadow-2xl">
                    <Link
                      href="/admin/movies"
                      onClick={() => setAdminMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm transition hover:bg-white/10 hover:text-lime-400"
                    >
                      🎬 Manage Movies
                    </Link>

                    <a
                      href="/admin/blog"
                      rel="noopener noreferrer"
                      onClick={() => setAdminMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm transition hover:bg-white/10 hover:text-lime-400"
                    >
                      📰 Manage OpenPage
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:border-lime-400 hover:text-lime-400"
            >
              Log out
            </button>
          </nav>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm"
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-2 border-t border-white/10 px-5 py-4 md:hidden">
            <Link
              href="/home"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10"
            >
              Home
            </Link>

            {isAdmin && !checkingUser && (
              <div className="rounded-xl border border-lime-400/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-lime-400">
                  Admin Tools
                </p>

                <Link
                  href="/admin/movies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10"
                >
                  🎬 Manage Movies
                </Link>

                <a
                  href="https://openpage-lime.vercel.app/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10"
                >
                  📰 Manage OpenPage
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-white/15 px-3 py-3 text-left text-sm hover:border-lime-400 hover:text-lime-400"
            >
              Log out
            </button>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-10 rounded-3xl border border-white/10 bg-gradient-to-br from-lime-400/10 to-transparent p-7 sm:p-12">
          <p className="mb-3 text-sm font-semibold tracking-[0.25em] text-lime-400">
            YOUR ENTERTAINMENT UNIVERSE
          </p>

          <h1 className="text-4xl font-black sm:text-6xl">
            Stories worth <span className="text-lime-400">watching.</span>
          </h1>

          <p className="mt-4 max-w-xl text-gray-400">
            Discover your next favourite movie with ColdStar OTT.
          </p>

          <div className="mt-7 max-w-lg">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movies or genres..."
              className="w-full rounded-xl border border-white/15 bg-black/40 px-5 py-4 outline-none focus:border-lime-400"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Explore Movies</h2>
          <span className="text-sm text-gray-500">
            {filteredMovies.length} movies
          </span>
        </div>

        {loading && (
          <p className="py-12 text-center text-gray-400">
            Loading your movies...
          </p>
        )}

        {!loading && error && (
          <p role="alert" className="py-12 text-center text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && filteredMovies.length === 0 && (
          <p className="py-12 text-center text-gray-400">
            No movies found. Try another search.
          </p>
        )}

        {!loading && !error && filteredMovies.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredMovies.map((movie) => {
              const poster = movie.poster_display_url;

              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:-translate-y-1 hover:border-lime-400/60"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#151a20]">
                    {poster && (
                      <Image
                        src={poster}
                        alt={`${movie.title} poster`}
                        width={300}
                        height={400}
                        unoptimized
                        onError={(event) => {
                          event.currentTarget.style.display = "none";

                          const placeholder =
                            event.currentTarget.nextElementSibling as
                              | HTMLElement
                              | null;

                          if (placeholder) {
                            placeholder.style.display = "flex";
                          }
                        }}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}

                    <span
                      className="absolute inset-0 items-center justify-center text-6xl"
                      style={{ display: poster ? "none" : "flex" }}
                    >
                      {movie.emoji || "🎬"}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="truncate font-bold">{movie.title}</h3>

                    <p className="mt-2 text-xs text-gray-400">
                      {[movie.release_year, movie.genre]
                        .filter(Boolean)
                        .join(" · ") || "Movie"}
                    </p>

                    {movie.rating != null && (
                      <p className="mt-3 text-sm text-lime-400">
                        ★ {movie.rating}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-gray-500">
        © 2026 ColdStar OTT · Your entertainment universe
      </footer>
    </main>
  );
}
