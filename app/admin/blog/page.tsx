"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Metric = {
  count: number | null;
  error: string | null;
};

type PublishedArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
};

const sections = [
  {
    label: "Published Articles",
    table: "openpage_articles",
    status: "published",
  },
  { label: "Page Views", table: "openpage_page_views", status: null },
  { label: "Click Events", table: "openpage_click_events", status: null },
  { label: "User Profiles", table: "profiles", status: null },
  { label: "Feedback Entries", table: "openpage_feedback", status: null },
] as const;

export default function BlogPage() {
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const [results, articleResult] = await Promise.all([
      Promise.all(
        sections.map(async ({ table, status }) => {
          const countQuery = supabase
          .from(table)
          .select("*", { count: "exact", head: true });
          const { count, error } = status
            ? await countQuery.eq("status", status)
            : await countQuery;

          return [
            table,
            {
              count: error ? null : (count ?? 0),
              error: error?.message ?? null,
            },
          ] as const;
        })
      ),
      supabase
        .from("openpage_articles")
        .select(
          "id, title, slug, category, author_name, published_at, created_at"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      metrics: Object.fromEntries(results),
      articles: articleResult.data ?? [],
      articlesError: articleResult.error?.message ?? null,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const result = await fetchAnalytics();

        setMetrics(result.metrics);
        setArticles(result.articles);
        setArticlesError(result.articlesError);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Unable to load blog analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAnalytics();
    const refreshTimer = window.setInterval(() => {
      void loadAnalytics();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [fetchAnalytics]);

  const refreshAnalytics = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await fetchAnalytics();
      setMetrics(result.metrics);
      setArticles(result.articles);
      setArticlesError(result.articlesError);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setLoadError("Unable to load blog analytics.");
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (table: string) => {
    const metric = metrics[table];

    if (loading && !metric) return "…";
    if (!metric || metric.error || metric.count === null) return "N/A";

    return metric.count.toLocaleString();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Blog Analytics</h1>
            <p className="mt-2 text-sm text-slate-400">
              Overview of blog activity and related records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/home"
              className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              Back to OTT Home
            </a>
            <button
              type="button"
              onClick={() => void refreshAnalytics()}
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mb-5 rounded-lg bg-red-950 p-4 text-red-300">
            {loadError}
          </p>
        )}

        <section
          aria-label="Analytics overview"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sections.map((section) => (
            <article
              key={section.table}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="text-sm text-slate-400">{section.label}</h2>
              <p className="mt-3 text-3xl font-semibold">
                {getMetricValue(section.table)}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Latest OpenPage Articles</h2>
            <a
              href="https://openpage-lime.vercel.app/articles"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              View all on OpenPage ↗
            </a>
          </div>

          {articlesError ? (
            <p role="alert" className="rounded-lg bg-red-950 p-4 text-red-300">
              Could not load OpenPage articles: {articlesError}
            </p>
          ) : articles.length === 0 && loading ? (
            <p className="py-4 text-slate-400">Loading articles…</p>
          ) : articles.length === 0 ? (
            <p className="py-4 text-slate-400">
              No published articles were found.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {articles.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div>
                    <a
                      href={`https://openpage-lime.vercel.app/articles/${encodeURIComponent(article.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white hover:text-cyan-300"
                    >
                      {article.title}
                    </a>
                    <p className="mt-1 text-sm text-slate-400">
                      {article.category}
                      {article.author_name ? ` · By ${article.author_name}` : ""}
                    </p>
                  </div>
                  <time
                    dateTime={article.published_at ?? article.created_at}
                    className="text-sm text-slate-400"
                  >
                    {new Date(
                      article.published_at ?? article.created_at
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Data sources</h2>
            <p className="text-sm text-slate-400">
              {lastUpdated ? `Updated at ${lastUpdated}` : "Not updated yet"}
            </p>
          </div>

          <ul className="divide-y divide-slate-800">
            {sections.map((section) => {
              const metric = metrics[section.table];
              let status = "Live";

              if (loading && !metric) status = "Loading";
              if (metric?.error) status = "Unavailable";

              return (
                <li
                  key={section.table}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span>{section.label}</span>
                  <span className="text-sm text-slate-400">{status}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}