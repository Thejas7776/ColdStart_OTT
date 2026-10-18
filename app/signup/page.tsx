
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setMessage("This email may already be registered. Please log in.");
        return;
      }

      if (!data.session) {
        setMessage(
          "Account created! Check your email to verify your account, then log in."
        );
        setSuccess(true);
        return;
      }

      // A session exists, so the user can go to the homepage.
      window.location.assign("/");
    } catch {
      setMessage("Unable to register. Please try again.");
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
            <span className="mt-3 block text-[9px] font-normal tracking-[0.8em] text-zinc-500">
              ORIGINALS
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.09] bg-[#101210] p-6 shadow-2xl shadow-black/40 sm:p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-medium tracking-tight">
              Create account
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Your next story starts here.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-zinc-300">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-zinc-800 bg-[#090b09] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
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
              <label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-zinc-800 bg-[#090b09] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
              />
            </div>

            {message && (
              <p
                role="status"
                className={`rounded-lg border p-3 text-sm ${
                  success
                    ? "border-lime-400/20 bg-lime-400/[0.06] text-lime-300"
                    : "border-red-500/20 bg-red-500/[0.06] text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-lime-400 transition hover:text-lime-300"
            >
              Log in
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
