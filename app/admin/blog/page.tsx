"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Metric = {
  count: number | null;
  error: string | null;
};

const sections = [
  { label: "Page Views", table: "openpage_page_views" },
  { label: "Click Events", table: "openpage_click_events" },
  { label: "User Profiles", table: "profiles" },
  { label: "Feedback Entries", table: "openpage_feedback" },
] as const;

export default function BlogPage() {
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (): Promise<Record<string, Metric>> => {
    const results = await Promise.all(
      sections.map(async ({ table }) => {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        return [
          table,
          {
            count: error ? null : (count ?? 0),
            error: error?.message ?? null,
          },
        ] as const;
      })
    );

    return Object.fromEntries(results);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchAnalytics()
      .then((result) => {
        if (cancelled) return;

        setMetrics(result);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Unable to load blog analytics.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAnalytics]);

  const refreshAnalytics = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await fetchAnalytics();
      setMetrics(result);
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
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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