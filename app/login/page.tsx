
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

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

      const { data: passkeys, error: passkeyError } =
        await supabase.auth.passkey.list();

      if (passkeyError) {
        setMessage(
          "Signed in with your password. Passkey setup could not be checked, but you can continue."
        );
        setCanContinue(true);
        return;
      }

      if (passkeys.length === 0) {
        setMessage(
          "Signed in. Register face/device sign-in now so you can use it next time."
        );
        setShowPasskeySetup(true);
        return;
      }

      router.replace("/home");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPasskey();

      if (error) {
        setMessage(
          "Face/device sign-in was not completed. Enter your email and password below."
        );
        return;
      }

      if (!data.user) {
        setMessage(
          "Face/device sign-in could not be confirmed. Enter your email and password below."
        );
        return;
      }

      router.replace("/home");
    } catch {
      setMessage(
        "Face/device sign-in is unavailable. Enter your email and password below."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyRegistration() {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.registerPasskey();

      if (error) {
        setMessage(
          `Passkey setup did not finish: ${error.message}. You can continue with your password.`
        );
        setCanContinue(true);
        return;
      }

      router.replace("/home");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Passkey setup did not finish: ${error.message}`
          : "Passkey setup did not finish. You can continue with your password."
      );
      setCanContinue(true);
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

          <div className="mb-5">
            <button
              type="button"
              onClick={() => void handlePasskeyLogin()}
              disabled={loading}
              className="w-full rounded-lg bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Checking..." : "Sign in with face / device passkey"}
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Uses Face ID, Windows Hello, fingerprint, or your device PIN.
            </p>
            <p className="my-5 text-center text-xs uppercase tracking-[0.2em] text-zinc-600">
              or use email and password
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
              className="w-full rounded-lg border border-zinc-700 py-3 font-semibold text-white transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          {showPasskeySetup && (
            <button
              type="button"
              onClick={() => void handlePasskeyRegistration()}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Register face/device sign-in"}
            </button>
          )}

          {(canContinue || showPasskeySetup) && (
            <button
              type="button"
              onClick={() => router.replace("/home")}
              className="mt-3 w-full rounded-lg border border-zinc-700 py-3 text-sm text-zinc-300 transition hover:border-zinc-500"
            >
              Continue with email and password
            </button>
          )}

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
