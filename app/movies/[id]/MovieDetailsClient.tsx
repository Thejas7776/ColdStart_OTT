
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

async function getPosterUrl(
  path: string | null | undefined
): Promise<string | null> {
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

function getYouTubeId(value: string | null | undefined): string | null {
  if (!value) return null;

  const input = value.trim();
  if (!input) return null;

  // Support a raw YouTube video ID.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(
      /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)
        ? input
        : `https://${input}`
    );

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      videoId =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ??
        null;
    } else {
      return null;
    }

    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? videoId
      : null;
  } catch {
    return null;
  }
}

export default function MovieDetailsClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMovie() {
      try {
        const [authResult, movieResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("movies")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
        ]);

        const {
          data: { user },
          error: authError,
        } = authResult;
        if (authError || !user) {
          router.replace("/login");
          return;
        }

        if (movieResult.error) {
          throw new Error(movieResult.error.message);
        }

        if (!movieResult.data) {
          throw new Error("Movie not found.");
        }

        const foundMovie = movieResult.data as Movie;
        const localPoster = getLocalPoster(foundMovie.title);
        const posterUrl =
          localPoster || (await getPosterUrl(foundMovie.poster_url));
        let videoUrl: string | null = null;

        if (
          foundMovie.video_source?.trim().toLowerCase() === "upload" &&
          foundMovie.video_path
        ) {
          if (/^https?:\/\//i.test(foundMovie.video_path)) {
            videoUrl = foundMovie.video_path;
          } else {
            const { data: videoData, error: videoError } =
              await supabase.storage
                .from("movie-videos")
                .createSignedUrl(foundMovie.video_path, 3600);

            if (videoError) {
              throw new Error(
                `Could not access the uploaded video: ${videoError.message}`
              );
            }
            videoUrl = videoData.signedUrl;
          }
        }

        if (!cancelled) {
          setMovie(foundMovie);
          setPoster(posterUrl);
          setUploadedVideoUrl(videoUrl);
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
        <p role="alert" className="text-red-400">
          {error || "Movie not found."}
        </p>
        <button
          onClick={() => router.push("/home")}
          className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-black"
        >
          Back to Movies
        </button>
      </main>
    );
  }

  const source = movie.video_source?.trim().toLowerCase();
  const trailerId =
    source === "youtube" ? getYouTubeId(movie.youtube_video_id) : null;
  const hasPlayableVideo =
    Boolean(trailerId) ||
    (source === "upload" && Boolean(uploadedVideoUrl));

  return (
    <main className="min-h-screen bg-[#080b10] text-white">
      <section className="bg-gradient-to-br from-[#101b34] via-[#06202a] to-black px-6 py-12 sm:py-16">
        <div
          className={`mx-auto grid max-w-7xl items-center gap-10 md:gap-16 ${
            showTrailer ? "grid-cols-1" : "md:grid-cols-[384px_1fr]"
          }`}
        >
          <div
            className={`relative w-full overflow-hidden rounded-3xl border border-white/15 bg-[#181818] ${
              showTrailer ? "" : "max-w-sm"
            }`}
            style={{
              aspectRatio: "16 / 9",
            }}
          >
            {showTrailer && trailerId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1`}
                title={`${movie.title} trailer`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : showTrailer && uploadedVideoUrl ? (
              <video
                src={uploadedVideoUrl}
                title={`${movie.title} video`}
                className="absolute inset-0 h-full w-full bg-black object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : poster ? (
              <Image
                src={poster}
                alt={`${movie.title} poster`}
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                unoptimized
                onError={() => {
                  const localPoster = getLocalPoster(movie.title);

                  if (localPoster && poster !== localPoster) {
                    setPoster(localPoster);
                  } else {
                    setPoster(null);
                  }
                }}
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
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <span className="text-6xl">{movie.emoji || "🎬"}</span>
                <span className="font-bold">{movie.title}</span>
                {hasPlayableVideo && (
                  <button
                    type="button"
                    onClick={() => setShowTrailer(true)}
                    aria-label={`Play ${movie.title} trailer`}
                    className="rounded-full bg-lime-400 px-5 py-3 font-bold text-black"
                  >
                    ▶ Play trailer
                  </button>
                )}
              </div>
            )}
            {hasPlayableVideo && !showTrailer && poster && (
              <button
                type="button"
                onClick={() => setShowTrailer(true)}
                aria-label={`Play ${movie.title} trailer`}
                className="absolute inset-0 flex items-center justify-center bg-black/15 transition hover:bg-black/35"
              >
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-400 text-2xl text-black shadow-lg transition hover:scale-110"
                >
                  ▶
                </span>
              </button>
            )}
            {!showTrailer && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-5 pt-16">
                <p className="text-center text-xl font-bold text-white drop-shadow-lg">
                  {movie.title}
                </p>
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

            {!hasPlayableVideo && (
              <p className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
                No playable video has been added for this movie yet.
              </p>
            )}

            <button
              onClick={() => router.push("/home")}
              className="ml-0 mt-4 rounded-xl border border-white/20 px-6 py-4 font-semibold hover:border-lime-400 sm:ml-3"
            >
              Back to Movies
            </button>
          </div>
        </div>
      </section>

    </main>
  );
}
