
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Movie = {
  id: string | number;
  title: string;
  description?: string | null;
  genre?: string | null;
  release_year?: number | null;
  duration?: string | number | null;
  rating?: string | number | null;
  emoji?: string | null;
  poster_url?: string | null;
  youtube_video_id?: string | null;
  video_source?: string | null;
  video_path?: string | null;
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
  const normalized = title.toLowerCase().trim();

  const match = Object.entries(localPosters).find(([name]) =>
    normalized.includes(name)
  );

  return match?.[1] ?? null;
}

async function getPosterUrl(path: string | null | undefined) {
  if (!path) return null;

  if (
    path.startsWith("https://") ||
    path.startsWith("http://") ||
    path.startsWith("/")
  ) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from("movie-posters")
    .createSignedUrl(path, 3600);

  if (error) {
    console.error("Poster loading failed:", error.message);
    return null;
  }

  return data.signedUrl;
}

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMovie() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error: movieError } = await supabase
          .from("movies")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (movieError) {
          throw new Error(movieError.message);
        }

        if (!data) {
          throw new Error("Movie not found.");
        }

        const foundMovie = data as Movie;

        // Prefer the local poster when one is available.
        const localPoster = getLocalPoster(foundMovie.title);
        const posterUrl =
          localPoster || (await getPosterUrl(foundMovie.poster_url));

        if (!cancelled) {
          setMovie(foundMovie);
          setPoster(posterUrl);
        }
      } catch (err) {
        console.error("Could not load movie:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load movie details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadMovie();
    }

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b10] text-white">
        Loading movie details...
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080b10] px-6 text-white">
        <p className="text-red-400">{error || "Movie not found."}</p>
        <button
          onClick={() => router.push("/home")}
          className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-black"
        >
          Back to Movies
        </button>
      </main>
    );
  }

  const trailerId =
    movie.video_source === "youtube" ? movie.youtube_video_id : null;

  return (
    <main className="min-h-screen bg-[#080b10] text-white">
      <section className="bg-gradient-to-br from-[#101b34] via-[#06202a] to-black px-6 py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-[384px_1fr] md:gap-16">
          <div className="flex aspect-[3/4] w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-[#181818]">
            {poster ? (
              <img
                src={poster}
                alt={`${movie.title} poster`}
                onError={() => {
                  const localPoster = getLocalPoster(movie.title);

                  if (localPoster && poster !== localPoster) {
                    setPoster(localPoster);
                  } else {
                    setPoster(null);
                  }
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <span className="text-6xl">{movie.emoji || "🎬"}</span>
                <span className="font-bold">{movie.title}</span>
              </div>
            )}
          </div>

          <div>
            <p className="mb-5 text-sm font-bold tracking-[0.3em] text-lime-400">
              COLDSTAR · MOVIE DETAILS
            </p>

            <h1 className="text-4xl font-black sm:text-6xl">
              {movie.title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {movie.release_year && (
                <span className="rounded-lg border border-white/20 px-3 py-2">
                  {movie.release_year}
                </span>
              )}

              {movie.duration && (
                <span className="rounded-lg border border-white/20 px-3 py-2">
                  {movie.duration} min
                </span>
              )}

              {movie.rating != null && (
                <span className="rounded-lg border border-white/20 px-3 py-2">
                  ⭐ {movie.rating}
                </span>
              )}
            </div>

            {movie.genre && (
              <p className="mt-5 font-semibold text-lime-400">
                {movie.genre}
              </p>
            )}

            <p className="mt-5 max-w-xl text-base leading-8 text-gray-300">
              {movie.description || "Discover this movie on ColdStar OTT."}
            </p>

            {trailerId && (
              <button
                onClick={() => setShowTrailer(!showTrailer)}
                className="mt-7 rounded-xl bg-lime-400 px-6 py-4 font-bold text-black transition hover:bg-lime-300"
              >
                ▶ {showTrailer ? "Hide Trailer" : "Watch Trailer"}
              </button>
            )}

            <button
              onClick={() => router.push("/home")}
              className="ml-3 mt-7 rounded-xl border border-white/20 px-6 py-4 font-semibold hover:border-lime-400"
            >
              Back to Movies
            </button>
          </div>
        </div>
      </section>

      {showTrailer && trailerId && (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="mb-5 text-2xl font-bold">
            Official Trailer — {movie.title}
          </h2>

          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerId)}?autoplay=1`}
              title={`${movie.title} trailer`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>
      )}
    </main>
  );
}
