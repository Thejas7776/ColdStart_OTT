
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const WARNING_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_KEY = "coldstar:adminActivity";

export default function SessionTimeout() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [signingOut, setSigningOut] = useState(false);

  const isAdminRef = useRef(false);
  const signingOutRef = useRef(false);
 const lastActivityRef = useRef<number>(0);
 
  const recordActivity = useCallback(() => {
    if (!isAdminRef.current || signingOutRef.current) return;

    const now = Date.now();
    lastActivityRef.current = now;
    setShowWarning(false);

    try {
      localStorage.setItem(ACTIVITY_KEY, String(now));
    } catch {
      // Continue with in-memory tracking if storage is unavailable.
    }
  }, []);

  const verifyAdmin = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      isAdminRef.current = false;
      setIsAdmin(false);
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const admin = !profileError && profile?.role === "admin";

    isAdminRef.current = admin;
    setIsAdmin(admin);

    return admin;
  }, []);

  const expireSession = useCallback(async () => {
    if (!isAdminRef.current || signingOutRef.current) return;

    signingOutRef.current = true;
    setSigningOut(true);

    try {
      const admin = await verifyAdmin();

      if (!admin) {
        signingOutRef.current = false;
        setSigningOut(false);
        setShowWarning(false);
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Automatic logout failed:", error.message);
        signingOutRef.current = false;
        setSigningOut(false);
        return;
      }

      try {
        localStorage.removeItem(ACTIVITY_KEY);
      } catch {
        // Ignore storage restrictions.
      }

      isAdminRef.current = false;
      setIsAdmin(false);
      setShowWarning(false);

      router.replace("/login?reason=timeout");
    } catch (error) {
      console.error("Automatic logout failed:", error);
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }, [router, verifyAdmin]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const admin = await verifyAdmin();

      if (!mounted || !admin) return;

      let savedActivity = 0;

      try {
        savedActivity = Number(
          localStorage.getItem(ACTIVITY_KEY) || 0
        );
      } catch {
        // Use current time if storage is unavailable.
      }

      const now = Date.now();

      if (
        !Number.isFinite(savedActivity) ||
        savedActivity <= 0 ||
        savedActivity > now
      ) {
        lastActivityRef.current = now;
        recordActivity();
        return;
      }

      lastActivityRef.current = savedActivity;

      // Expire an already inactive session on initialization.
      if (now - savedActivity >= TIMEOUT_MS) {
        await expireSession();
      }
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        isAdminRef.current = false;
        setIsAdmin(false);
        setShowWarning(false);

        try {
          localStorage.removeItem(ACTIVITY_KEY);
        } catch {
          // Ignore storage restrictions.
        }
      }

      if (event === "SIGNED_IN") {
        signingOutRef.current = false;
        setSigningOut(false);

        // Avoid performing database queries inside the auth callback.
        window.setTimeout(() => {
          if (mounted) void initialize();
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [verifyAdmin, recordActivity, expireSession]);

  useEffect(() => {
    if (!isAdmin) return;

    const activityEvents = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    const onActivity = () => recordActivity();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_KEY || !event.newValue) return;

      const timestamp = Number(event.newValue);

      if (
        Number.isFinite(timestamp) &&
        timestamp > lastActivityRef.current
      ) {
        lastActivityRef.current = timestamp;
        setShowWarning(false);
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      if (!isAdminRef.current || signingOutRef.current) return;

      let lastActivity = lastActivityRef.current;

      try {
        const sharedActivity = Number(
          localStorage.getItem(ACTIVITY_KEY) || 0
        );

        if (
          Number.isFinite(sharedActivity) &&
          sharedActivity > lastActivity
        ) {
          lastActivity = sharedActivity;
          lastActivityRef.current = sharedActivity;
        }
      } catch {
        // Continue with in-memory tracking.
      }

      // Actively playing video counts as ongoing use.
      const playingVideo = Array.from(
        document.querySelectorAll("video")
      ).some((video) => !video.paused && !video.ended);

      if (playingVideo) {
        recordActivity();
        setSecondsLeft(300);
        setShowWarning(false);
        return;
      }

      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(
        0,
        Math.ceil((TIMEOUT_MS - elapsed) / 1000)
      );

      setSecondsLeft(remaining);

      if (elapsed >= TIMEOUT_MS) {
        void expireSession();
      } else {
        setShowWarning(elapsed >= WARNING_MS);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);

      activityEvents.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
    };
  }, [isAdmin, recordActivity, expireSession]);

  async function staySignedIn() {
    if (signingOutRef.current) return;

    const admin = await verifyAdmin();

    if (!admin) {
      setShowWarning(false);
      router.replace("/login");
      return;
    }

    recordActivity();
    setSecondsLeft(300);
    setShowWarning(false);
  }

  if (!isAdmin || !showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10151d] p-6 text-white shadow-2xl sm:p-8"
      >
        <h2
          id="session-timeout-title"
          className="text-xl font-bold sm:text-2xl"
        >
          Admin session expiring
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-300">
          You&apos;ve been inactive for a while. You&apos;ll be signed out
          automatically unless you choose to stay signed in.
        </p>

        <p
          className="mt-5 text-center text-3xl font-bold tabular-nums text-lime-400"
          aria-live="off"
        >
          {minutes}:{String(seconds).padStart(2, "0")}
        </p>

        <p className="mt-1 text-center text-xs text-gray-500">
          Time remaining before automatic logout
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={signingOut}
            onClick={staySignedIn}
            className="flex-1 rounded-lg bg-lime-400 px-4 py-3 font-semibold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            Stay signed in
          </button>

          <button
            type="button"
            disabled={signingOut}
            onClick={expireSession}
            className="flex-1 rounded-lg border border-white/15 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Log out now"}
          </button>
        </div>
      </section>
    </div>
  );
}
