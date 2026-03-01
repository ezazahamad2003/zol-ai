"use client";

import { createClient } from "@/server/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Mail, CheckCircle, Clock } from "lucide-react";

type State = "idle" | "loading" | "sent";

const COOLDOWN_SECONDS = 60;

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("over_email")) {
    return "Too many attempts. Please wait a minute before trying again, or check your existing emails.";
  }
  if (lower.includes("link_invalid") || lower.includes("otp_expired") || lower.includes("access_denied")) {
    return "This link has already been used or has expired. Please request a new magic link below.";
  }
  return message;
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    initialError ? friendlyError(initialError) : null
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Supabase puts error info in the URL hash when a token is expired/already-used.
  // Hash params are invisible server-side, so we read them here on the client.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace("#", ""));
    const hashError = params.get("error_description") || params.get("error");
    if (hashError) {
      setError(friendlyError(hashError));
      // Clean up the hash from the URL
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email || cooldown > 0) return;
    setState("loading");
    setError(null);

    // Call the server-side API route so the PKCE code verifier is stored in
    // cookies (not localStorage), ensuring the callback can find it server-side.
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/auth/callback`,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(friendlyError(data.error ?? "Something went wrong. Please try again."));
      setState("idle");
    } else {
      setState("sent");
      startCooldown();
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid email profile",
      },
    });
    setGoogleLoading(false);
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-violet-400" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">Check your inbox</h2>
        <p className="text-gray-400 text-sm mb-1">We sent a sign-in link to</p>
        <p className="text-violet-300 font-medium text-sm mb-6 break-all">{email}</p>

        {cooldown > 0 ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Resend available in {cooldown}s</span>
          </div>
        ) : (
          <button
            onClick={() => { setState("idle"); setError(null); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
          >
            Use a different email or resend
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading" || !email || cooldown > 0}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === "loading" ? (
            <div className="w-4 h-4 border-2 border-violet-300 border-t-white rounded-full animate-spin" />
          ) : cooldown > 0 ? (
            <Clock className="w-4 h-4" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          {state === "loading"
            ? "Sending link..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Send Magic Link"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 transition-colors text-gray-900 font-semibold py-3 px-4 rounded-xl disabled:opacity-60"
      >
        {googleLoading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {googleLoading ? "Signing in..." : "Continue with Google"}
      </button>
    </div>
  );
}
