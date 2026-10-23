
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCachedMovies,
  setCachedMovies,
  type CachedMovie,
} from "@/lib/movie-cache";

type Movie = CachedMovie;

export default function HomePage() {
  const router = useRouter();

  const [movies, setMovies] = useState<Movie[]>(() => getCachedMovies() ?? []);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading] = useState(() => getCachedMovies() === null);
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
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session?.user) {
          router.replace("/login");
          return;
        }

        const [profileResult, moviesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("movies")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        setIsAdmin(
          !profileResult.error && profileResult.data?.role === "admin"
        );
        setCheckingUser(false);

        if (moviesResult.error) {
          throw new Error(moviesResult.error.message);
        }

        const movieList = (moviesResult.data ?? []) as Movie[];

        const signedPaths = Array.from(
          new Set(
            movieList
              .map((movie) => movie.poster_url)
              .filter(
                (path): path is string =>
                  typeof path === "string" &&
                  path.length > 0 &&
                  !/^https?:\/\//i.test(path) &&
                  !path.startsWith("/")
              )
          )
        );
        const signedUrls = new Map<string, string>();

        if (signedPaths.length > 0) {
          const { data, error: signingError } = await supabase.storage
            .from("movie-posters")
            .createSignedUrls(signedPaths, 3600);

          if (signingError) {
            console.error("Could not sign movie posters:", signingError.message);
          } else {
            data.forEach((item) => {
              if (item.path && item.signedUrl) {
                signedUrls.set(item.path, item.signedUrl);
              } else if (item.error) {
                console.error(
                  "Could not sign movie poster:",
                  item.path,
                  item.error
                );
              }
            });
          }
        }

        const moviesWithPosters = movieList.map((movie) => ({
          ...movie,
          poster_display_url: movie.poster_url
            ? /^https?:\/\//i.test(movie.poster_url) ||
              movie.poster_url.startsWith("/")
              ? movie.poster_url
              : signedUrls.get(movie.poster_url) ?? null
            : null,
        })) as Movie[];

        if (!cancelled) {
          setMovies(moviesWithPosters);
          setCachedMovies(moviesWithPosters);
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

  const genres = Array.from(
    new Set(
      movies
        .flatMap((movie) =>
          (movie.genre ?? "")
            .split(",")
            .map((genre) => genre.trim())
            .filter(Boolean)
        )
        .sort((left, right) => left.localeCompare(right))
    )
  );

  const filteredMovies = movies.filter((movie) => {
    const matchesQuery =
      movie.title.toLowerCase().includes(query) ||
      (movie.genre ?? "").toLowerCase().includes(query);
    const matchesGenre =
      !selectedGenre ||
      (movie.genre ?? "")
        .split(",")
        .some((genre) => genre.trim() === selectedGenre);

    return matchesQuery && matchesGenre;
  });

  return (
    <main className="min-h-screen bg-[#080b10] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => router.push("/home")}
            aria-label="ColdStar home"
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

                    <Link
                      href="/admin/blog"
                      onClick={() => setAdminMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm transition hover:bg-white/10 hover:text-lime-400"
                    >
                      📰 Manage OpenPage
                    </Link>
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

                <Link
                  href="/admin/blog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10"
                >
                  📰 Manage OpenPage
                </Link>
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

      <section className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-lime-400/15 via-[#101720] to-[#080b10] p-6 sm:p-12">
          <p className="mb-3 text-sm font-semibold tracking-[0.25em] text-lime-400">
            YOUR ENTERTAINMENT UNIVERSE
          </p>

          <h1 className="text-4xl font-black sm:text-6xl">
            Stories worth <span className="text-lime-400">watching.</span>
          </h1>

          <p className="mt-4 max-w-xl text-gray-400">
            Discover your next favourite movie with ColdStar OTT.
          </p>

          <div className="mt-7 flex max-w-2xl gap-3">
            <input
              type="search"
              aria-label="Search movies by title or genre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movies or genres..."
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-5 py-4 outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
            />
            {(search || selectedGenre) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedGenre("");
                }}
                className="rounded-xl border border-white/15 px-4 text-sm font-semibold text-gray-300 transition hover:border-lime-400 hover:text-lime-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
              Your collection
            </p>
            <h2 className="mt-1 text-2xl font-bold">Explore Movies</h2>
          </div>
          <span aria-live="polite" className="text-sm text-gray-400">
            {filteredMovies.length} of {movies.length} movies
          </span>
        </div>

        {genres.length > 0 && (
          <div className="mb-7 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              aria-pressed={!selectedGenre}
              onClick={() => setSelectedGenre("")}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                !selectedGenre
                  ? "border-lime-400 bg-lime-400 text-black"
                  : "border-white/15 text-gray-300 hover:border-lime-400/60"
              }`}
            >
              All genres
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                aria-pressed={selectedGenre === genre}
                onClick={() =>
                  setSelectedGenre((current) =>
                    current === genre ? "" : genre
                  )
                }
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                  selectedGenre === genre
                    ? "border-lime-400 bg-lime-400 text-black"
                    : "border-white/15 text-gray-300 hover:border-lime-400/60"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

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
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <p className="text-lg font-semibold text-white">No movies found</p>
            <p className="mt-2 text-sm text-gray-400">
              Try another title or genre, or clear your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedGenre("");
              }}
              className="mt-5 rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-lime-300"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && filteredMovies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filteredMovies.map((movie) => {
              const poster = movie.poster_display_url;

              return (
                <Link
                  key={movie.id}
                  href={`/movies/${movie.id}`}
                  aria-label={`View ${movie.title} movie details`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition duration-200 hover:-translate-y-1 hover:border-lime-400/60 hover:shadow-[0_16px_50px_rgba(163,230,53,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                >
                  <div
                    className="relative overflow-hidden bg-[#151a20]"
                    style={{
                      aspectRatio: "16 / 9",
                    }}
                  >
                    {poster && (
                      <Image
                        src={poster}
                        alt={`${movie.title} poster`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
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
                        className="transition duration-300 group-hover:scale-105"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          maxWidth: "none",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
                      />
                    )}

                    <span
                      className="absolute inset-0 items-center justify-center text-6xl"
                      style={{ display: poster ? "none" : "flex" }}
                    >
                      {movie.emoji || "🎬"}
                    </span>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3 pt-12">
                      <p className="line-clamp-2 text-center text-sm font-bold text-white drop-shadow-lg">
                        {movie.title}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <p className="truncate text-sm font-semibold text-gray-300">
                      {[movie.release_year, movie.genre]
                        .filter(Boolean)
                        .join(" · ") || "Movie"}
                    </p>

                    {movie.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                        {movie.description}
                      </p>
                    )}

                    <div className="mt-3 flex min-h-7 items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        View details
                      </span>
                      {movie.rating != null && (
                        <span className="shrink-0 rounded-md bg-lime-400/10 px-2 py-1 text-sm font-bold text-lime-300">
                          ★ {movie.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
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
