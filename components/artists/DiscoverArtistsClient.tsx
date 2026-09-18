"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiscoverArtistDoc, TenderDoc } from "@/lib/types";
import type { MatchResult } from "@/lib/matching/score";

const fmtINR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * /discover-artists — Phase 5 admin console.
 *
 * Three sections:
 *   1. Matching brief → top 5 matched artists
 *   2. Artists list (read-only + link to detail)
 *   3. Tenders list (with status pills)
 */
export default function DiscoverArtistsClient({
  artists,
  tenders,
}: {
  artists: DiscoverArtistDoc[];
  tenders: TenderDoc[];
}) {
  const [artForms, setArtForms] = useState("Yakshagana");
  const [budget, setBudget] = useState<number>(25000);
  const [city, setCity] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [poolSize, setPoolSize] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runMatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/discover-artists/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artForms: artForms.split(",").map((s) => s.trim()).filter(Boolean),
          budgetINR: budget,
          cityHint: city || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "match failed");
      setResults(data.results ?? []);
      setPoolSize(data.poolSize ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-rust">
          Phase 5  ·  Pillar of Energy
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Discover artists + tenders</h1>
        <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
          A verified-artist database with quotation history, ratings, and an
          automatic matching algorithm — score every artist against an enquiry
          by price, distance, and past performance. Includes a tender-tracking
          module for government and institutional opportunities.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      {/* ---- Matching brief ------------------------------------- */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h2 className="font-display text-xl text-ink">Run a match</h2>
        <p className="mt-1 font-body text-xs text-umber">
          Tell us what you're looking for and we'll score every verified artist
          by art-form coverage, price fit, distance, and past performance.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Art forms (comma-separated)">
            <input
              className="w-full rounded border border-stone/40 bg-linen px-3 py-2 font-body text-sm"
              value={artForms}
              onChange={(e) => setArtForms(e.target.value)}
              placeholder="Yakshagana, Dollu Kunitha"
            />
          </Field>
          <Field label="Budget (INR)">
            <input
              type="number"
              className="w-full rounded border border-stone/40 bg-linen px-3 py-2 font-body text-sm"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </Field>
          <Field label="City (optional hint)">
            <input
              className="w-full rounded border border-stone/40 bg-linen px-3 py-2 font-body text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bengaluru"
            />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={runMatch}
              disabled={busy}
              className="w-full rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
            >
              {busy ? "Matching…" : "Match artists"}
            </button>
          </div>
        </div>

        {results !== null ? (
          <div className="mt-6">
            <p className="font-body text-xs text-umber">
              Scored {poolSize} artists · showing top {results.length}
            </p>
            {results.length === 0 ? (
              <p className="mt-3 font-body text-sm text-ink-soft">
                No matching artists. Try widening the art-forms or the budget.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {results.map((r, i) => (
                  <li
                    key={r.artist.slug}
                    className="rounded-xl border border-stone/40 bg-linen p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="font-body text-[11px] uppercase tracking-wider text-umber">
                          #{i + 1}
                        </span>
                        <h3 className="font-display text-lg text-ink">
                          {r.artist.name}
                          <span className="ml-2 font-body text-xs text-umber">
                            {r.artist.stateSlug}
                            {r.artist.city ? ` · ${r.artist.city}` : ""}
                          </span>
                        </h3>
                        <p className="mt-1 font-body text-sm text-ink-soft">
                          {(r.artist.artForms ?? []).join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl text-gold">
                          {(r.score * 100).toFixed(0)}%
                        </div>
                        <div className="font-body text-[10px] uppercase tracking-wider text-umber">
                          match
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ScoreBar label="Art form" value={r.components.artForm} />
                      <ScoreBar label="Price" value={r.components.price} />
                      <ScoreBar label="Distance" value={r.components.distance} />
                      <ScoreBar label="Rating" value={r.components.rating} />
                    </div>
                    {r.reasons.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {r.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="rounded-full bg-moss/10 px-2 py-0.5 font-body text-[11px] text-moss"
                          >
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </section>

      {/* ---- Artists list ---------------------------------------- */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl text-ink">
            {artists.length} verified artist{artists.length === 1 ? "" : "s"}
          </h2>
          <Link
            href="https://wriksh.com/onboarding"
            className="font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
          >
            Verify a new artist →
          </Link>
        </div>
        {artists.length === 0 ? (
          <p className="mt-3 font-body text-sm text-ink-soft">
            No artists in the database yet. Run the onboarding form at
            wriksh.com/onboarding to add your first.
          </p>
        ) : (
          <table className="mt-4 w-full font-body text-sm">
            <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">State</th>
                <th className="py-2">City</th>
                <th className="py-2">Art forms</th>
                <th className="py-2">Quotations</th>
                <th className="py-2">Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((a) => {
                const avg =
                  a.ratings?.length
                    ? a.ratings.reduce((s, r) => s + r.score, 0) / a.ratings.length
                    : null;
                return (
                  <tr key={a.slug} className="border-b border-stone/20">
                    <td className="py-2">
                      <div className="font-display text-ink">{a.name}</div>
                      <div className="font-mono text-[11px] text-umber">{a.slug}</div>
                    </td>
                    <td className="py-2 text-ink-soft">{a.stateSlug}</td>
                    <td className="py-2 text-ink-soft">{a.city ?? "—"}</td>
                    <td className="py-2 text-ink-soft">
                      {(a.artForms ?? []).slice(0, 3).join(", ")}
                    </td>
                    <td className="py-2 text-ink-soft">{a.quotations?.length ?? 0}</td>
                    <td className="py-2 text-ink-soft">
                      {avg != null ? `★ ${avg.toFixed(1)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ---- Tenders ----------------------------------------------- */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h2 className="font-display text-xl text-ink">
          {tenders.length} tender{tenders.length === 1 ? "" : "s"} tracked
        </h2>
        {tenders.length === 0 ? (
          <p className="mt-3 font-body text-sm text-ink-soft">
            No tenders in the database. Add the first one via the API.
          </p>
        ) : (
          <table className="mt-4 w-full font-body text-sm">
            <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
              <tr>
                <th className="py-2">Reference</th>
                <th className="py-2">Title</th>
                <th className="py-2">Issuing body</th>
                <th className="py-2">Deadline</th>
                <th className="py-2 text-right">Budget</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((t) => (
                <tr key={t.referenceId} className="border-b border-stone/20">
                  <td className="py-2 font-mono text-[11px] text-umber">{t.referenceId}</td>
                  <td className="py-2 font-display text-ink">{t.title}</td>
                  <td className="py-2 text-ink-soft">{t.issuingBody}</td>
                  <td className="py-2 text-ink-soft">
                    {new Date(t.deadline).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right text-ink-soft">
                    {t.budgetINR ? `₹${fmtINR.format(t.budgetINR)}` : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider " +
                        tenderPillClass(t.status ?? "open")
                      }
                    >
                      {t.status ?? "open"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between font-body text-[10px] uppercase tracking-wider text-umber">
        <span>{label}</span>
        <span>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded bg-stone/30">
        <div
          className="h-1.5 rounded bg-gold"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

function tenderPillClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-gold/20 text-gold";
    case "submitted":
      return "bg-moss/20 text-moss";
    case "won":
      return "bg-forest text-linen";
    case "lost":
      return "bg-clay/20 text-clay";
    case "cancelled":
      return "bg-stone/40 text-umber";
    default:
      return "bg-stone/40 text-umber";
  }
}
