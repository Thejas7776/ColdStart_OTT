
import { Suspense } from "react";
import MovieDetailsClient from "./MovieDetailsClient";

export default function MovieDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080b10] text-white">
          Loading movie details...
        </main>
      }
    >
      <MovieDetailsClient />
    </Suspense>
  );
}
