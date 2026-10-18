
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

const localPosters: Record<string, string> = {
  "777 charlie": "/posters/777-charlie.jpg",
  kantara: "/posters/kantara.jpg",
  kgf: "/posters/kgf.jpg",
  "kirik party": "/posters/kirik-party.jpg",
  "sapta sagara": "/posters/sapta-sagaradaache-ello.jpg",
  ugramm: "/posters/ugramm.jpg",
  ramayana: "/posters/rama.jpg",
};

function getLocalPoster(title: string): string | null {
  const normalizedTitle = title.toLowerCase().trim();

  const match = Object.entries(localPosters).find(([name]) =>
    normalizedTitle.includes(name)
  );

  return match?.[1] ?? null;
}

async function getPosterUrl(path: string | null | undefined) {
  if (!path) return null;

  // Local public-folder paths and complete URLs need no signing.
  if (
    path.startsWith("https://") ||
    path.startsWith("http://") ||
    path.startsWith("/")
  ) {
    return path;
  }

  // Create a temporary URL for posters stored in Supabase.
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

        const { data, error: moviesError } = await supabase
          .from("movies")
          .select("*")
          .order("created_at", { ascending: false });

        if (moviesError) {
          throw new Error(moviesError.message);
        }

        const movieList = (data ?? []) as Movie[];

        const moviesWithPosters = await Promise.all(
          movieList.map(async (movie) => {
            const localPoster = getLocalPoster(movie.title);

            // For Ramayana and other mapped movies, prefer the local
            // poster so a missing Supabase file cannot break the image.
            const posterUrl = localPoster
              ? localPoster
              : await getPosterUrl(movie.poster_url);

            return {
              ...movie,
              poster_display_url: posterUrl,
            };
          })
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
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <button
            onClick={() => router.push("/home")}
            className="text-2xl font-black tracking-tight"
          >
            COLD<span className="text-lime-400">STAR</span>
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-lime-400 hover:text-lime-400"
          >
            Log out
          </button>
        </div>
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
              onChange={(e) => setSearch(e.target.value)}
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
              const poster =
                movie.poster_display_url ||
                getLocalPoster(movie.title);

              return (
                <button
                  key={movie.id}
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:-translate-y-1 hover:border-lime-400/60"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#151a20]">
                    <Image
                      src={poster || ""}
                      alt={`${movie.title} poster`}
                      width={300}
                      height={400}
                      unoptimized
                      onError={(event) => {
                        const image = event.currentTarget;
                        const localPoster = getLocalPoster(movie.title);

                        // If the current image fails, try the local poster.
                        if (
                          localPoster &&
                          !image.src.endsWith(localPoster)
                        ) {
                          image.onerror = null;
                          image.src = localPoster;
                          return;
                        }

                        image.style.display = "none";

                        const placeholder =
                          image.nextElementSibling as HTMLElement | null;

                        if (placeholder) {
                          placeholder.style.display = "flex";
                        }
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />

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
