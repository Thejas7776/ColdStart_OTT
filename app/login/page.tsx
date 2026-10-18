
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(
          error.message.includes("Email not confirmed")
            ? "Please verify your email before logging in."
            : "Invalid email or password. Please try again."
        );
        return;
      }

      if (!data.user) {
        setMessage("Login failed. Please try again.");
        return;
      }

      // Redirect the signed-in user to the movie homepage.
      window.location.replace("/home");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a08] px-5 py-10 text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-lime-400/[0.08] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-lime-300/[0.06] blur-[120px]" />

      <section className="relative w-full max-w-md">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-light tracking-[0.24em] sm:text-5xl">
              <span className="text-lime-400">COLD</span>
              <span className="text-white">STAR</span>
            </h1>
            <span className="mt-3 block text-[9px] tracking-[0.8em] text-zinc-500">
              ORIGINALS
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.09] bg-[#101210] p-6 shadow-2xl shadow-black/40 sm:p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-medium tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to continue your entertainment journey.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-800 bg-[#090b09] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm text-zinc-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-lime-400 hover:text-lime-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-zinc-800 bg-[#090b09] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
              />
            </div>

            {message && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-red-300"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            New to ColdStar?{" "}
            <Link
              href="/signup"
              className="font-medium text-lime-400 hover:text-lime-300"
            >
              Create an account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.18em] text-zinc-600">
          COLDSTAR ORIGINALS · ENTER A NEW WORLD
        </p>
      </section>
    </main>
  );
}
