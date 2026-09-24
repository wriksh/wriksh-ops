"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /login — Wriksh Ops shared-password login screen.
 *
 * Direct port of `wriksh-dev`'s /admin/login UX, reskinned to the Dhoomkethu
 * palette and retargeted at /api/auth/login. On success the user is pushed
 * to `?next=` (default "/") and the router is refreshed so server components
 * re-render with the new cookie context.
 */
function OpsLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") || "/";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        setLoading(false);
        if (res.ok) {
          router.push(next);
          router.refresh();
        } else {
          setError("That password isn't right.");
        }
      }}
      className="w-full max-w-sm rounded-2xl border border-stone/60 bg-parchment p-8 shadow-card"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-2xl text-ink">Wriksh Ops</span>
        <span className="font-body text-[10px] uppercase tracking-[0.32em] text-gold">
          Dhoomkethu
        </span>
      </div>

      <p className="mt-6 text-center font-display text-xl text-ink">
        Operations console
      </p>
      <p className="mt-2 text-center font-body text-sm text-umber">
        Catalogue pipeline, marketing calendar, finance, and more.
      </p>

      <label className="mt-8 block font-body text-xs uppercase tracking-widest2 text-umber">
        Password
      </label>
      <input
        autoFocus
        required
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full rounded-lg border border-stone bg-linen px-4 py-3 font-body text-ink outline-none focus:border-gold"
      />
      {error && <p className="mt-3 font-body text-sm text-clay">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-gold px-6 py-3 font-body text-xs uppercase tracking-[0.24em] text-linen transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export default function OpsLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linen px-6">
      <Suspense fallback={null}>
        <OpsLoginForm />
      </Suspense>
    </div>
  );
}
