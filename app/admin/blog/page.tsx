"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [editingArticle, setEditingArticle] = useState<{
    id: string;
    title: string;
    category: string;
    author_name: string;
  } | null>(null);
  const [savingArticleId, setSavingArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [articleActionError, setArticleActionError] = useState<string | null>(
    null
  );
  const [articleActionMessage, setArticleActionMessage] = useState<
    string | null
  >(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const refreshInProgress = useRef(false);

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

  const refreshAnalytics = useCallback(async (showLoading = false) => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchAnalytics();
      setMetrics(result.metrics);
      setArticles(result.articles);
      setArticlesError(result.articlesError);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Refreshing blog analytics failed:", error);
      setLoadError("Unable to load blog analytics.");
    } finally {
      setLoading(false);
      refreshInProgress.current = false;
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      void refreshAnalytics();
    }, 0);
    let eventRefreshTimer: number | undefined;

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshAnalytics();
      }
    }, 60_000);

    const scheduleEventRefresh = () => {
      window.clearTimeout(eventRefreshTimer);
      eventRefreshTimer = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          void refreshAnalytics();
        }
      }, 350);
    };

    const realtimeChannel = supabase
      .channel("blog-admin-live-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openpage_articles",
        },
        scheduleEventRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openpage_page_views",
        },
        scheduleEventRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        scheduleEventRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openpage_feedback",
        },
        scheduleEventRefresh
      )
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED";
        setRealtimeConnected(connected);
        if (!connected && status !== "CLOSED") {
          console.error("Blog analytics realtime subscription status:", status);
        }
      });

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshAnalytics();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearTimeout(eventRefreshTimer);
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      void supabase.removeChannel(realtimeChannel);
    };
  }, [refreshAnalytics]);

  const startEditingArticle = (article: PublishedArticle) => {
    setEditingArticle({
      id: article.id,
      title: article.title,
      category: article.category,
      author_name: article.author_name ?? "",
    });
    setArticleActionError(null);
    setArticleActionMessage(null);
  };

  const saveArticle = async () => {
    if (!editingArticle) return;

    const title = editingArticle.title.trim();
    const category = editingArticle.category.trim();

    if (!title || !category) {
      setArticleActionError("Article title and category are required.");
      return;
    }

    setSavingArticleId(editingArticle.id);
    setArticleActionError(null);
    setArticleActionMessage(null);

    try {
      const { data, error } = await supabase
        .from("openpage_articles")
        .update({
          title,
          category,
          author_name: editingArticle.author_name.trim() || null,
        })
        .eq("id", editingArticle.id)
        .select("id");

      if (error) throw error;
      if (!data?.length) {
        throw new Error(
          "No article was updated. Check the OpenPage article update permissions."
        );
      }

      setArticles((current) =>
        current.map((article) =>
          article.id === editingArticle.id
            ? {
                ...article,
                title,
                category,
                author_name: editingArticle.author_name.trim() || null,
              }
            : article
        )
      );
      setEditingArticle(null);
      setArticleActionMessage("Article updated successfully.");
    } catch (error) {
      setArticleActionError(
        error instanceof Error ? error.message : "Could not update the article."
      );
    } finally {
      setSavingArticleId(null);
    }
  };

  const deleteArticle = async (article: PublishedArticle) => {
    if (
      !window.confirm(
        `Delete "${article.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingArticleId(article.id);
    setArticleActionError(null);
    setArticleActionMessage(null);

    try {
      const { data, error } = await supabase
        .from("openpage_articles")
        .delete()
        .eq("id", article.id)
        .select("id");

      if (error) throw error;
      if (!data?.length) {
        throw new Error(
          "No article was deleted. Check the OpenPage article delete permissions."
        );
      }

      setArticles((current) =>
        current.filter((item) => item.id !== article.id)
      );
      if (editingArticle?.id === article.id) setEditingArticle(null);
      setArticleActionMessage("Article deleted successfully.");
    } catch (error) {
      setArticleActionError(
        error instanceof Error ? error.message : "Could not delete the article."
      );
    } finally {
      setDeletingArticleId(null);
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
            <>
            {articleActionError && (
              <p role="alert" className="mb-4 rounded-lg bg-red-950 p-4 text-red-300">
                {articleActionError}
              </p>
            )}
            {articleActionMessage && (
              <p role="status" className="mb-4 rounded-lg bg-emerald-950 p-4 text-emerald-300">
                {articleActionMessage}
              </p>
            )}
            <ul className="divide-y divide-slate-800">
              {articles.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                >
                  {editingArticle?.id === article.id ? (
                    <div className="grid w-full gap-3 md:grid-cols-3">
                      <label className="text-sm text-slate-300">
                        Title
                        <input
                          value={editingArticle.title}
                          onChange={(event) =>
                            setEditingArticle((current) =>
                              current
                                ? { ...current, title: event.target.value }
                                : current
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Category
                        <input
                          value={editingArticle.category}
                          onChange={(event) =>
                            setEditingArticle((current) =>
                              current
                                ? { ...current, category: event.target.value }
                                : current
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Author
                        <input
                          value={editingArticle.author_name}
                          onChange={(event) =>
                            setEditingArticle((current) =>
                              current
                                ? { ...current, author_name: event.target.value }
                                : current
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 md:col-span-3">
                        <button
                          type="button"
                          onClick={() => void saveArticle()}
                          disabled={savingArticleId === article.id}
                          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          {savingArticleId === article.id
                            ? "Saving…"
                            : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingArticle(null)}
                          disabled={savingArticleId === article.id}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-white disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                          {article.author_name
                            ? ` · By ${article.author_name}`
                            : ""}
                        </p>
                        <time
                          dateTime={article.published_at ?? article.created_at}
                          className="mt-1 block text-xs text-slate-500"
                        >
                          {new Date(
                            article.published_at ?? article.created_at
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingArticle(article)}
                          disabled={Boolean(savingArticleId || deletingArticleId)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-white hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteArticle(article)}
                          disabled={Boolean(savingArticleId || deletingArticleId)}
                          className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                        >
                          {deletingArticleId === article.id
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Data sources</h2>
            <p className="text-sm text-slate-400">
              {lastUpdated
                ? `Updated at ${lastUpdated} · ${
                    realtimeConnected
                      ? "Live updates enabled"
                      : "Checking for updates every minute"
                  }`
                : realtimeConnected
                  ? "Live updates enabled"
                  : "Checking for updates every minute"}
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