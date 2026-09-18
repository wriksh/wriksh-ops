"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LearnHostDoc } from "@/lib/types";

const TYPES: { value: LearnHostDoc["type"]; label: string; tone: string }[] = [
  { value: "ttc", label: "TTC", tone: "bg-gold/20 text-gold" },
  { value: "csr", label: "CSR", tone: "bg-moss/20 text-moss" },
  { value: "apprenticeship", label: "Apprenticeship", tone: "bg-clay/20 text-clay" },
  { value: "workshop", label: "Workshop", tone: "bg-forest text-linen" },
];

export default function LearnHostsClient({ initialHosts }: { initialHosts: LearnHostDoc[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hosts, setHosts] = useState<LearnHostDoc[]>(initialHosts);
  const [editing, setEditing] = useState<LearnHostDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditing({
      slug: "",
      name: "",
      type: "ttc",
      artForm: "",
      stateSlug: "",
      city: "",
      duration: "",
      feeINR: 0,
      status: "published",
      contact: {},
    } as LearnHostDoc);
    setError(null);
  }
  function startEdit(h: LearnHostDoc) {
    setEditing({ ...h });
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing._id;
      const url = isCreate
        ? "/api/learn-hosts/host"
        : `/api/learn-hosts/host/${editing.slug}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      if (isCreate) setHosts((prev) => [...prev, data.host]);
      else setHosts((prev) => prev.map((h) => (h.slug === data.host.slug ? data.host : h)));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete "${slug}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/learn-hosts/host/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setHosts((prev) => prev.filter((h) => h.slug !== slug));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const fmtINR = new Intl.NumberFormat("en-IN");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-umber">
            Phase 6b  ·  Pillar of Energy
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Learn hosts · TTC · CSR</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            Hosts who run the long-form learning paths — Teacher Training
            Courses (Athma Kalari, Shiva Yoga, Svara Mudra, Ayurveda),
            Corporate Social Responsibility engagements, and serious
            apprenticeships.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-gold-bright"
        >
          + Add host
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {hosts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-stone/40 bg-parchment p-6 font-body text-sm text-ink-soft">
            No hosts yet. Click <em>+ Add host</em> to create the first.
          </div>
        ) : null}
        {hosts.map((h) => {
          const typeConfig = TYPES.find((t) => t.value === h.type) ?? TYPES[0];
          return (
            <div key={h.slug} className="rounded-2xl border border-stone/40 bg-parchment p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider ${typeConfig.tone}`}>
                      {typeConfig.label}
                    </span>
                    <span className="font-mono text-[11px] text-umber">{h.slug}</span>
                  </div>
                  <h3 className="mt-1 font-display text-xl text-ink">{h.name}</h3>
                  <p className="mt-1 font-body text-sm text-ink-soft">
                    {h.artForm}
                    {h.stateSlug ? ` · ${h.stateSlug}` : ""}
                    {h.city ? ` · ${h.city}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {h.feeINR != null && h.feeINR > 0 ? (
                    <div className="font-display text-xl text-ink">
                      ₹{fmtINR.format(h.feeINR)}
                    </div>
                  ) : (
                    <span className="font-body text-xs italic text-umber">free / on request</span>
                  )}
                  {h.duration ? (
                    <div className="font-body text-[11px] text-umber">{h.duration}</div>
                  ) : null}
                </div>
              </div>
              {h.description ? (
                <p className="mt-3 font-body text-sm text-ink-soft">{h.description}</p>
              ) : null}
              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(h)}
                  className="font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(h.slug)}
                  className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
            <h3 className="font-display text-2xl text-ink">
              {editing.slug ? `Edit ${editing.slug}` : "New learn host"}
            </h3>
            <div className="mt-4 space-y-3">
              <Field label="Slug">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  disabled={!!editing._id}
                />
              </Field>
              <Field label="Name">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.type ?? "ttc"}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as LearnHostDoc["type"] })}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Art form">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    placeholder="Kalari · Yoga · Ayurveda"
                    value={editing.artForm ?? ""}
                    onChange={(e) => setEditing({ ...editing, artForm: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State slug">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.stateSlug ?? ""}
                    onChange={(e) => setEditing({ ...editing, stateSlug: e.target.value })}
                  />
                </Field>
                <Field label="City">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    placeholder="21 days residential"
                    value={editing.duration ?? ""}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                  />
                </Field>
                <Field label="Fee (INR)">
                  <input
                    type="number"
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.feeINR ?? 0}
                    onChange={(e) => setEditing({ ...editing, feeINR: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  className="h-24 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <Field label="Contact email">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                  value={editing.contact?.email ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      contact: { ...editing.contact, email: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border border-stone/60 px-4 py-2 font-body text-[11px] uppercase tracking-wider text-umber hover:bg-parchment"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
