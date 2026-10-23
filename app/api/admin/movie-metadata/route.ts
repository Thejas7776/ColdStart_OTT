import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

function getYouTubeId(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

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
    }

    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? videoId
      : null;
  } catch {
    return null;
  }
}

function getTitleCandidates(videoTitle: string): string[] {
  const cleanSegment = (segment: string) =>
    segment
      .replace(/#\S+/g, " ")
      .replace(
        /^(?:(?:official|final|new)\s+)*(?:teaser|trailer|promo)\s*[:\-–—|]\s*/i,
        ""
      )
      .replace(
        /\s*(?:[-–—:]\s*)?(?:(?:official|final|new)\s+)*(?:teaser|trailer|promo|clip|song|video)\b.*$/i,
        ""
      )
      .replace(/\s*\([^)]*(?:teaser|trailer|promo|clip)[^)]*\)\s*/gi, " ")
      .replace(/\s*[\[(]\s*(?:19|20)\d{2}\s*[\])]\s*/g, " ")
      .replace(/\b(?:4k|1080p|720p|hd|full hd|hindi|kannada|telugu|tamil|malayalam)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const segments = videoTitle
    .split(/[|｜•]/)
    .flatMap((segment) => [
      segment,
      ...segment.split(/\s+[-–—]\s+/),
    ]);
  const candidates = segments
    .map(cleanSegment)
    .filter((candidate) => candidate.length >= 2);

  return [...new Set(candidates)];
}

function normalizeTitle(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function titlesMatch(candidate: string, query: string): boolean {
  const normalizedCandidate = normalizeTitle(candidate);
  const normalizedQuery = normalizeTitle(query);

  if (normalizedCandidate === normalizedQuery) return true;
  if (normalizedCandidate.length < 4 || normalizedQuery.length < 4) {
    return false;
  }

  return (
    normalizedCandidate.startsWith(normalizedQuery) ||
    normalizedQuery.startsWith(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Movie metadata admin check failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify administrator access." },
      { status: 500 }
    );
  }

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }

  const youtubeUrl = request.nextUrl.searchParams.get("youtubeUrl") ?? "";
  const videoId = getYouTubeId(youtubeUrl);

  if (!videoId) {
    return NextResponse.json(
      { error: "Enter a valid YouTube video URL or video ID." },
      { status: 400 }
    );
  }

  try {
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set(
      "url",
      `https://www.youtube.com/watch?v=${videoId}`
    );
    oembedUrl.searchParams.set("format", "json");

    const youtubeResponse = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!youtubeResponse.ok) {
      return NextResponse.json(
        { error: "Could not read details for this YouTube video." },
        { status: 422 }
      );
    }

    const youtubeData: { title?: unknown } = await youtubeResponse.json();
    const titleCandidates =
      typeof youtubeData.title === "string"
        ? getTitleCandidates(youtubeData.title)
        : [];
    const title = titleCandidates[0] ?? "";

    if (!title) {
      return NextResponse.json(
        { error: "YouTube did not provide a usable video title." },
        { status: 422 }
      );
    }

    const posterUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const apiKey = process.env.OMDB_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({
        title,
        posterUrl,
        rating: null,
        releaseYear: null,
        duration: null,
        description: null,
        ratingMessage:
          "Add OMDB_API_KEY to your server environment to fetch IMDb rating and movie details.",
      });
    }

    const activeApiKey = apiKey;

    async function fetchOmdb(params: Record<string, string>) {
      const omdbUrl = new URL("https://www.omdbapi.com/");
      omdbUrl.searchParams.set("apikey", activeApiKey);
      Object.entries(params).forEach(([key, value]) =>
        omdbUrl.searchParams.set(key, value)
      );

      const response = await fetch(omdbUrl, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("OMDb request failed with status:", response.status);
        throw new Error("OMDb request failed.");
      }

      return (await response.json()) as {
        Response?: string;
        Error?: string;
        Title?: string;
        imdbRating?: string;
        Year?: string;
        Runtime?: string;
        Plot?: string;
        Genre?: string;
        Search?: Array<{ Title: string; imdbID: string; Type: string }>;
      };
    }

    let omdbData:
      | Awaited<ReturnType<typeof fetchOmdb>>
      | undefined;

    for (const candidate of titleCandidates.slice(0, 6)) {
      omdbData = await fetchOmdb({ t: candidate, type: "movie" });
      if (omdbData.Response === "True" || omdbData.Error === "Invalid API key!") {
        break;
      }

      const searchData = await fetchOmdb({ s: candidate, type: "movie" });
      if (searchData.Error === "Invalid API key!") {
        omdbData = searchData;
        break;
      }

      const match = searchData.Search?.find(
        (movie) =>
          movie.Type === "movie" &&
          titlesMatch(movie.Title, candidate)
      );

      if (match) {
        omdbData = await fetchOmdb({ i: match.imdbID });
        break;
      }
    }

    if (!omdbData) {
      return NextResponse.json({
        title,
        posterUrl,
        rating: null,
        releaseYear: null,
        duration: null,
        description: null,
        genre: null,
        notFound: true,
        ratingMessage: `No movie details were found for "${title}".`,
      });
    }

    if (omdbData.Response !== "True" && omdbData.Error === "Invalid API key!") {
      return NextResponse.json({
        title,
        posterUrl,
        rating: null,
        releaseYear: null,
        duration: null,
        description: null,
        genre: null,
        ratingMessage: "The OMDb API key is invalid. Check OMDB_API_KEY.",
      });
    }

    if (
      omdbData.Response !== "True"
    ) {
      return NextResponse.json({
        title,
        matchedTitle: title,
        posterUrl,
        rating: null,
        releaseYear: null,
        duration: null,
        description: null,
        genre: null,
        notFound: true,
        ratingMessage: `No movie details were found for "${title}".`,
      });
    }

    const releaseYear = omdbData.Year?.match(/\b\d{4}\b/)?.[0] ?? null;
    const duration = omdbData.Runtime?.match(/\b\d+\b/)?.[0] ?? null;
    const description =
      omdbData.Plot && omdbData.Plot !== "N/A" ? omdbData.Plot : null;
    const genre =
      omdbData.Genre && omdbData.Genre !== "N/A" ? omdbData.Genre : null;
    const rating =
      omdbData.imdbRating &&
      /^\d+(?:\.\d+)?$/.test(omdbData.imdbRating)
        ? omdbData.imdbRating
        : null;

    return NextResponse.json({
      title,
      matchedTitle:
        typeof omdbData.Title === "string" ? omdbData.Title : title,
      posterUrl,
      rating,
      releaseYear,
      duration,
      description,
      genre,
      ratingMessage: rating
        ? null
        : `Movie details found, but no IMDb rating is available for "${title}".`,
    });
  } catch (error) {
    console.error("Movie metadata lookup failed:", error);
    return NextResponse.json(
      { error: "Could not fetch movie metadata. Please try again." },
      { status: 502 }
    );
  }
}
