
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setChecking(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (!profileError && profile?.role === "admin") {
          router.replace("/admin");
          return;
        }

        setChecking(false);
      } catch {
        if (active) setChecking(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        throw new Error("Invalid email or password.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();

        throw new Error(
          "Access denied. This account is not an approved administrator."
        );
      }

      window.location.replace("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-lime-400">
        Checking administrator access...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center text-3xl tracking-[0.25em]"
        >
          <span className="text-lime-400">COLD</span>STAR
        </Link>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/10 text-2xl">
              🔐
            </div>

            <h1 className="text-2xl font-bold">
              Admin <span className="text-lime-400">Login</span>
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Authorized administrators only
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block text-sm text-zinc-300">
              Admin email
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-lime-400"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-lime-400 px-5 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying access..." : "Secure Admin Login"}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
            <p className="text-sm text-zinc-400">
              New user? Create a regular account.
            </p>

            <Link
              href="/signup"
              className="mt-2 inline-block text-sm text-lime-400 hover:underline"
            >
              User Signup
            </Link>

            <p className="mt-4">
              <Link
                href="/login"
                className="text-sm text-zinc-400 hover:text-white"
              >
                User Login
              </Link>
            </p>
          </div>
        </section>

        <p className="mt-6 text-center text-xs tracking-widest text-zinc-600">
          COLDSTAR OTT · SECURE ACCESS
        </p>
      </div>
    </main>
  );
}
