export type CachedMovie = {
  id: string | number;
  title: string;
  description?: string | null;
  genre?: string | null;
  release_year?: number | null;
  duration?: string | number | null;
  rating?: number | string | null;
  poster_url?: string | null;
  poster_display_url?: string | null;
  emoji?: string | null;
  youtube_video_id?: string | null;
  video_source?: string | null;
  video_path?: string | null;
};

const CACHE_MAX_AGE = 50 * 60 * 1000;
let moviesCache: { movies: CachedMovie[]; cachedAt: number } | null = null;

export function getCachedMovies(): CachedMovie[] | null {
  if (!moviesCache || Date.now() - moviesCache.cachedAt > CACHE_MAX_AGE) {
    moviesCache = null;
    return null;
  }

  return moviesCache.movies;
}

export function getCachedMovie(id: string): CachedMovie | null {
  return (
    getCachedMovies()?.find((movie) => String(movie.id) === id) ?? null
  );
}

export function setCachedMovies(movies: CachedMovie[]) {
  moviesCache = { movies, cachedAt: Date.now() };
}

export function setCachedMovie(movie: CachedMovie) {
  const movies = getCachedMovies() ?? [];
  const existingIndex = movies.findIndex(
    (item) => String(item.id) === String(movie.id)
  );

  if (existingIndex === -1) {
    setCachedMovies([...movies, movie]);
    return;
  }

  setCachedMovies(
    movies.map((item, index) => (index === existingIndex ? movie : item))
  );
}
