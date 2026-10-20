
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Movie = {
  id: string | number;
  title: string;
  description: string | null;
  genre: string | null;
  release_year: number | null;
  duration: string | number | null;
  rating: string | number | null;
  poster_url: string | null;
  youtube_video_id: string | null;
  video_source: string | null;
  video_path: string | null;
  created_by?: string | null;
};

type MovieForm = {
  title: string;
  description: string;
  genre: string;
  release_year: string;
  duration: string;
  rating: string;
  poster_url: string;
  youtube_video_id: string;
};

const emptyForm: MovieForm = {
  title: "",
  description: "",
  genre: "",
  release_year: "",
  duration: "",
  rating: "",
  poster_url: "",
  youtube_video_id: "",
};

function getYouTubeId(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(
      input.startsWith("www.") ? `https://${input}` : input
    );

    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (
      url.hostname === "youtube.com" ||
      url.hostname.endsWith(".youtube.com") ||
      url.hostname === "youtube-nocookie.com" ||
      url.hostname.endsWith(".youtube-nocookie.com")
    ) {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) {
        return parts[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return "Something went wrong. Please try again.";
}

export default function ManageMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [form, setForm] = useState<MovieForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("movies")
        .select("*")
        .order("title", { ascending: true });

      if (fetchError) throw fetchError;
      setMovies((data ?? []) as Movie[]);
    } catch (err) {
      setError(`Could not load movies: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  async function fetchMovies() {
    await loadMovies();
  }

  void fetchMovies();
}, [loadMovies]);

  function updateField(field: keyof MovieForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setVideoFile(null);

    const input = document.getElementById(
      "movie-video-file"
    ) as HTMLInputElement | null;

    if (input) input.value = "";
  }

  function startEditing(movie: Movie) {
    setEditingId(movie.id);
    setForm({
      title: movie.title ?? "",
      description: movie.description ?? "",
      genre: movie.genre ?? "",
      release_year: movie.release_year?.toString() ?? "",
      duration: movie.duration?.toString() ?? "",
      rating: movie.rating?.toString() ?? "",
      poster_url: movie.poster_url ?? "",
      youtube_video_id: movie.youtube_video_id ?? "",
    });

    setVideoFile(null);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function getVerifiedAdmin() {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error("Please log in as an administrator first.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not verify admin profile: ${profileError.message}`);
    }

    if (!profile || profile.role !== "admin") {
      console.error("Admin profile mismatch", {
        userId: userData.user.id,
        profileRole: profile?.role ?? null,
      });
      throw new Error(
        "Your logged-in account does not have a matching admin profile."
      );
    }

    return userData.user;
  }

  async function uploadVideo(file: File) {
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Choose an MP4, WebM or MOV video file.");
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error("Video file must be 50 MB or smaller.");
    }

    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || result.message || "Video upload failed."
      );
    }

    const path =
      result.path ??
      result.video_path ??
      result.videoPath ??
      result.data?.path ??
      result.data?.video_path;

    const url =
      result.publicUrl ??
      result.public_url ??
      result.url ??
      result.data?.publicUrl ??
      result.data?.public_url ??
      result.data?.url;

    if (!path && !url) {
      throw new Error(
        "The upload API did not return a video path or URL. Check app/api/admin/upload/route.ts."
      );
    }

    return {
      path: String(path ?? url),
      source: "upload",
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Verify the session and admin role before writing to the database.
      const user = await getVerifiedAdmin();

      const title = form.title.trim();
      if (!title) throw new Error("Movie title is required.");

      const youtubeId = getYouTubeId(form.youtube_video_id);

      if (form.youtube_video_id.trim() && !youtubeId) {
        throw new Error("Enter a valid YouTube video URL or video ID.");
      }

      if (videoFile && youtubeId) {
        throw new Error(
          "Choose either a YouTube video or an uploaded video file, not both."
        );
      }

      const year = form.release_year.trim()
        ? Number(form.release_year)
        : null;
      const duration = form.duration.trim()
        ? Number(form.duration)
        : null;
      const rating = form.rating.trim()
        ? Number(form.rating)
        : null;

      if (
        year !== null &&
        (!Number.isInteger(year) || year < 1888 || year > 2100)
      ) {
        throw new Error("Enter a valid release year.");
      }

      if (
        duration !== null &&
        (!Number.isFinite(duration) || duration <= 0)
      ) {
        throw new Error("Duration must be a positive number of minutes.");
      }

      if (
        rating !== null &&
        (!Number.isFinite(rating) || rating < 0 || rating > 10)
      ) {
        throw new Error("Rating must be between 0 and 10.");
      }

      const currentMovie =
        editingId === null
          ? null
          : movies.find((movie) => String(movie.id) === String(editingId));

      let uploadedVideo: { path: string; source: string } | null = null;

      if (videoFile) {
        uploadedVideo = await uploadVideo(videoFile);
      }

      const videoSource = uploadedVideo
        ? "upload"
        : youtubeId
          ? "youtube"
          : currentMovie?.video_source ?? null;

      const videoPath = uploadedVideo
        ? uploadedVideo.path
        : youtubeId
          ? null
          : currentMovie?.video_path ?? null;

      const payload = {
        // Required by the current INSERT policy.
        created_by: user.id,
        title,
        description: form.description.trim() || null,
        genre: form.genre.trim() || null,
        release_year: year,
        duration: duration === null ? null : String(duration),
        rating: rating === null ? null : String(rating),
        poster_url: form.poster_url.trim() || null,
        video_source: videoSource,
        video_path: videoPath,
        youtube_video_id: youtubeId
          ? youtubeId
          : videoFile
            ? null
            : currentMovie?.youtube_video_id ?? null,
      };

      if (editingId !== null) {
        // Preserve the original owner when editing an existing movie.
        const updatePayload = { ...payload, created_by: currentMovie?.created_by ?? user.id };

        const { data, error: updateError } = await supabase
          .from("movies")
          .update(updatePayload)
          .eq("id", editingId)
          .select("id");

        if (updateError) throw updateError;
        if (!data?.length) {
          throw new Error(
            "No movie was updated. Check the movie ID and Supabase UPDATE policy."
          );
        }

        setMessage("Movie updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("movies")
          .insert(payload)
          .select("id");

        if (insertError) throw insertError;
        if (!data?.length) {
          throw new Error(
            "No movie was returned after saving. Check your Supabase INSERT policy."
          );
        }

        setMessage("Movie added successfully.");
      }

      resetForm();
      await loadMovies();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(movie: Movie) {
    const confirmed = window.confirm(
      `Delete "${movie.title}" from ColdStar OTT? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(movie.id);
    setError("");
    setMessage("");

    try {
      await getVerifiedAdmin();

      const { data, error: deleteError } = await supabase
        .from("movies")
        .delete()
        .eq("id", movie.id)
        .select("id");

      if (deleteError) throw deleteError;
      if (!data?.length) {
        throw new Error(
          "No movie was deleted. Check the Supabase DELETE policy."
        );
      }

      setMovies((current) =>
        current.filter((item) => String(item.id) !== String(movie.id))
      );

      if (String(editingId) === String(movie.id)) resetForm();

      setMessage(`"${movie.title}" was deleted from the catalogue.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
              ColdStar OTT
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">Movie Manager</h1>
            <p className="mt-2 text-sm text-gray-400">
              Add, view, edit and remove movies from your catalogue.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              ← Dashboard
            </Link>
            <Link
              href="/home"
              className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-bold text-black hover:bg-lime-300"
            >
              View OTT Home
            </Link>
          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-lime-400/30 bg-lime-400/10 p-4 text-sm text-lime-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              {editingId !== null ? "Edit Movie" : "Add a Movie"}
            </h2>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-300 underline hover:text-white"
              >
                Cancel editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm">
                Movie title *
                <input
                  required
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="Enter movie title"
                />
              </label>

              <label className="block text-sm">
                Genre
                <input
                  value={form.genre}
                  onChange={(e) => updateField("genre", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="Action, Drama, Comedy..."
                />
              </label>

              <label className="block text-sm">
                Release year
                <input
                  type="number"
                  min="1888"
                  max="2100"
                  value={form.release_year}
                  onChange={(e) => updateField("release_year", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="2026"
                />
              </label>

              <label className="block text-sm">
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="120"
                />
              </label>

              <label className="block text-sm">
                Rating (0–10)
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => updateField("rating", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="8.5"
                />
              </label>

              <label className="block text-sm">
                Poster image URL
                <input
                  type="url"
                  value={form.poster_url}
                  onChange={(e) => updateField("poster_url", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="https://example.com/poster.jpg"
                />
              </label>
            </div>

            <label className="block text-sm">
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                placeholder="Write a short movie description..."
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm">
                YouTube trailer URL or video ID
                <input
                  value={form.youtube_video_id}
                  onChange={(e) =>
                    updateField("youtube_video_id", e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-400"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <span className="mt-2 block text-xs text-gray-500">
                  Use a YouTube trailer or video link.
                </span>
              </label>

              <label className="block text-sm">
                Or upload a video file
                <input
                  id="movie-video-file"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-lime-400 file:px-3 file:py-2 file:font-bold file:text-black"
                />
                <span className="mt-2 block text-xs text-gray-500">
                  MP4, WebM or MOV. Maximum 50 MB. Choose either a file or
                  a YouTube link.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Add Movie"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Movie Catalogue</h2>
            <button
              type="button"
              onClick={() => void loadMovies()}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-gray-400">Loading movies...</p>
          ) : movies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-10 text-center text-gray-400">
              No movies found. Add your first movie above.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {movies.map((movie) => (
                <article
                  key={movie.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="aspect-[3/2] bg-black/40">
                    {movie.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={movie.poster_url}
                        alt={`${movie.title} poster`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600">
                        No poster available
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold">{movie.title}</h3>

                    <p className="mt-1 text-sm text-gray-400">
                      {[
                        movie.release_year,
                        movie.genre,
                        movie.duration ? `${movie.duration} min` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Movie details not added"}
                    </p>

                    <p className="mt-3 line-clamp-3 text-sm text-gray-300">
                      {movie.description || "No description available."}
                    </p>

                    <p className="mt-3 text-xs text-lime-300">
                      {movie.video_source === "youtube" ||
                      movie.youtube_video_id
                        ? "YouTube video"
                        : movie.video_source === "upload" || movie.video_path
                          ? "Uploaded video"
                          : "No video assigned"}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/movies/${movie.id}`}
                        className="rounded-lg bg-lime-400 px-3 py-2 text-sm font-bold text-black hover:bg-lime-300"
                      >
                        Open
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEditing(movie)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === movie.id}
                        onClick={() => void handleDelete(movie)}
                        className="rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                      >
                        {deletingId === movie.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
