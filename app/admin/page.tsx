
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_POSTER_SIZE = 5 * 1024 * 1024;

type VideoMode = "youtube" | "upload";

type AdminMovie = {
  id: string | number;
  title: string;
  release_year: number | null;
  genre: string | null;
  emoji: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [duration, setDuration] = useState("");
  const [rating, setRating] = useState("");
  const [emoji, setEmoji] = useState("🎬");

  const [videoMode, setVideoMode] = useState<VideoMode>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [updatingPosterId, setUpdatingPosterId] = useState<
    string | number | null
  >(null);

  const loadMovies = useCallback(async () => {
    setLoadingMovies(true);

    try {
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, release_year, genre, emoji")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setMovies((data ?? []) as AdminMovie[]);
    } catch (error) {
      console.error("Load movies error:", error);
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? `Could not load movies: ${error.message}`
          : "Could not load movies."
      );
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (error || profile?.role !== "admin") {
          router.replace("/");
          return;
        }

        await loadMovies();

        if (!cancelled) {
          setChecking(false);
        }
      } catch (error) {
        console.error("Admin verification failed:", error);

        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [router, loadMovies]);

  async function verifyAdmin() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please sign in again.");
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || profile?.role !== "admin") {
      throw new Error("Administrator access is required.");
    }

    return user;
  }

  function getYouTubeId(url: string): string | null {
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      let id: string | null = null;

      if (host === "youtu.be") {
        id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
      } else if (
        ["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)
      ) {
        if (parsed.pathname === "/watch") {
          id = parsed.searchParams.get("v");
        } else {
          const parts = parsed.pathname.split("/").filter(Boolean);

          if (["embed", "shorts", "live"].includes(parts[0])) {
            id = parts[1] ?? null;
          }
        }
      }

      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }

  async function uploadPoster(file: File, userId: string): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose a valid image for the poster.");
    }

    if (file.size > MAX_POSTER_SIZE) {
      throw new Error("Poster size must not exceed 5 MB.");
    }

    const extension =
      file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";

    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabase.storage
      .from("movie-posters")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error || !data) {
      throw new Error(
        `Poster upload failed: ${error?.message || "Unknown error"}`
      );
    }

    return data.path;
  }

  async function uploadVideo(file: File): Promise<string> {
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Choose an MP4, WebM, or QuickTime video.");
    }

    if (file.size <= 0 || file.size > MAX_VIDEO_SIZE) {
      throw new Error("Video size must not exceed 50 MB.");
    }

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not prepare video upload.");
    }

    const { data, error } = await supabase.storage
      .from("movie-videos")
      .uploadToSignedUrl(result.path, result.token, file, {
        contentType: file.type,
      });

    if (error || !data) {
      throw new Error(
        `Video upload failed: ${error?.message || "Unknown error"}`
      );
    }

    return result.path as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Capture the form before awaiting any asynchronous work.
    const form = event.currentTarget;

    setMessage("");
    setSuccess(false);
    setSaving(true);

    try {
      const user = await verifyAdmin();

      const year = Number(releaseYear);
      const movieDuration = duration.trim() ? Number(duration) : null;
      const movieRating = rating.trim() ? Number(rating) : null;

      if (!title.trim()) {
        throw new Error("Enter a movie title.");
      }

      if (!Number.isInteger(year) || year < 1888 || year > 2100) {
        throw new Error("Enter a valid release year.");
      }

      if (
        movieDuration !== null &&
        (!Number.isFinite(movieDuration) || movieDuration <= 0)
      ) {
        throw new Error("Duration must be a positive number of minutes.");
      }

      if (
        movieRating !== null &&
        (!Number.isFinite(movieRating) ||
          movieRating < 0 ||
          movieRating > 10)
      ) {
        throw new Error("Rating must be between 0 and 10.");
      }

      let youtubeVideoId: string | null = null;
      let videoPath: string | null = null;

      if (videoMode === "youtube") {
        youtubeVideoId = getYouTubeId(youtubeUrl);

        if (!youtubeVideoId) {
          throw new Error("Enter a valid YouTube video URL.");
        }
      } else {
        if (!videoFile) {
          throw new Error("Choose a video file to upload.");
        }

        videoPath = await uploadVideo(videoFile);
      }

      let posterPath: string | null = null;

      if (posterFile) {
        posterPath = await uploadPoster(posterFile, user.id);
      }

      const { error: insertError } = await supabase.from("movies").insert({
        title: title.trim(),
        description: description.trim() || null,
        genre: genre.trim() || null,
        release_year: year,
        duration: movieDuration,
        rating: movieRating,
        emoji: emoji.trim() || "🎬",
        youtube_video_id: youtubeVideoId,
        video_source: videoMode,
        video_path: videoPath,
        poster_url: posterPath,
        created_by: user.id,
      });

      if (insertError) {
        throw new Error(`Could not save movie: ${insertError.message}`);
      }

      setTitle("");
      setDescription("");
      setGenre("");
      setReleaseYear("");
      setDuration("");
      setRating("");
      setEmoji("🎬");
      setYoutubeUrl("");
      setVideoFile(null);
      setPosterFile(null);
      setVideoMode("youtube");

      form.reset();

      setSuccess(true);
      setMessage("Movie added successfully!");

      await loadMovies();
    } catch (error) {
      console.error("Add movie error:", error);
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // Replace the poster on an existing movie without creating a duplicate.
  async function handleUpdatePoster(movie: AdminMovie, file: File) {
    setMessage("");
    setSuccess(false);
    setUpdatingPosterId(movie.id);

    try {
      const user = await verifyAdmin();
      const newPosterPath = await uploadPoster(file, user.id);

      const { data: updatedMovie, error: updateError } = await supabase
        .from("movies")
        .update({ poster_url: newPosterPath })
        .eq("id", movie.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Could not update poster: ${updateError.message}`);
      }

      if (!updatedMovie) {
        throw new Error(
          "The poster was uploaded, but the movie record was not updated. Check the movies table UPDATE policy."
        );
      }

      setSuccess(true);
      setMessage(`Poster updated for "${movie.title}" successfully.`);
    } catch (error) {
      console.error("Update poster error:", error);
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Could not update poster."
      );
    } finally {
      setUpdatingPosterId(null);
    }
  }

  async function handleDeleteMovie(movie: AdminMovie) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${movie.title}"?\n\nThis removes its database record from ColdStar OTT.`
    );

    if (!confirmed) return;

    setMessage("");
    setSuccess(false);
    setDeletingId(movie.id);

    try {
      await verifyAdmin();

      const { data: deletedRows, error: deleteError } = await supabase
        .from("movies")
        .delete()
        .eq("id", movie.id)
        .select("id");

      if (deleteError) {
        throw new Error(`Could not delete movie: ${deleteError.message}`);
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          "The movie was not deleted. Check your Supabase DELETE policy."
        );
      }

      setMovies((current) =>
        current.filter((item) => item.id !== movie.id)
      );

      setSuccess(true);
      setMessage(`"${movie.title}" was deleted successfully.`);
    } catch (error) {
      console.error("Delete movie error:", error);
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Could not delete movie."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSuccess(false);
      setMessage("Unable to log out. Please try again.");
      return;
    }

    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-lime-400">
        Checking administrator access...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <header className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <Link href="/" className="text-xl tracking-widest">
          <span className="text-lime-400">COLD</span>STAR
          <span className="ml-3 text-xs tracking-normal text-zinc-500">
            ADMIN
          </span>
        </Link>

        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-lime-400 hover:text-lime-400"
          >
            Home
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-red-400 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">
          Add a <span className="text-lime-400">Movie</span>
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Add movie details, posters, and video sources to ColdStar OTT.
        </p>

        {message && (
          <div
            role="status"
            className={`mt-6 rounded-lg border p-4 text-sm ${
              success
                ? "border-lime-800 bg-lime-950/40 text-lime-300"
                : "border-red-800 bg-red-950/40 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-zinc-300">
              Movie title *
              <input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kantara"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Genre
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Action, Drama..."
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Release year *
              <input
                required
                type="number"
                min="1888"
                max="2100"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2026"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Duration (minutes)
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="145"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Rating (0–10)
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="8.5"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Emoji
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={12}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>
          </div>

          <label className="block text-sm text-zinc-300">
            Description
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short movie description..."
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
            />
          </label>

          <div className="border-t border-zinc-800 pt-6">
            <h2 className="font-semibold">Movie poster</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Optional · Image up to 5 MB
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              className="mt-3 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:font-semibold file:text-black"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h2 className="font-semibold">Movie video *</h2>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setVideoMode("youtube")}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  videoMode === "youtube"
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-zinc-700 text-zinc-300"
                }`}
              >
                YouTube URL
              </button>

              <button
                type="button"
                onClick={() => setVideoMode("upload")}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  videoMode === "upload"
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-zinc-700 text-zinc-300"
                }`}
              >
                Upload video
              </button>
            </div>

            {videoMode === "youtube" ? (
              <label className="mt-4 block text-sm text-zinc-300">
                YouTube video URL *
                <input
                  required
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
                />
              </label>
            ) : (
              <label className="mt-4 block text-sm text-zinc-300">
                Video file (maximum 50 MB) *
                <input
                  required
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:font-semibold file:text-black"
                />

                {videoFile && (
                  <span className="mt-2 block text-xs text-zinc-500">
                    {videoFile.name} ·{" "}
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-lime-400 px-5 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving movie..." : "Add Movie"}
          </button>
        </form>

        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                Manage <span className="text-lime-400">Movies</span>
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Update posters or remove movies from ColdStar OTT.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMovies}
              disabled={loadingMovies}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
            >
              {loadingMovies ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loadingMovies && movies.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">Loading movies...</p>
          ) : movies.length === 0 ? (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
              <p className="text-zinc-400">No movies found.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-2xl">
                      {movie.emoji || "🎬"}
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {movie.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {[movie.release_year, movie.genre]
                          .filter(Boolean)
                          .join(" · ") || "Movie"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`cursor-pointer rounded-lg border border-lime-700 px-4 py-2 text-sm font-semibold text-lime-400 hover:bg-lime-950 ${
                        updatingPosterId !== null
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      {updatingPosterId === movie.id
                        ? "Uploading..."
                        : "Update Poster"}

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={updatingPosterId !== null}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            await handleUpdatePoster(movie, file);
                          }

                          event.target.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteMovie(movie)}
                      disabled={
                        deletingId !== null || updatingPosterId !== null
                      }
                      className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === movie.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
