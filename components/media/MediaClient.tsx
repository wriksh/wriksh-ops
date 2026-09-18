"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaAssetDoc } from "@/lib/types";

const KINDS: { value: MediaAssetDoc["kind"]; label: string; tone: string }[] = [
  { value: "photo", label: "Photo", tone: "bg-gold/20 text-gold" },
  { value: "video", label: "Video", tone: "bg-clay/20 text-clay" },
  { value: "doc", label: "Doc", tone: "bg-moss/20 text-moss" },
  { value: "audio", label: "Audio", tone: "bg-umber/20 text-umber" },
];

export default function MediaClient({
  initialAssets,
  buckets,
}: {
  initialAssets: MediaAssetDoc[];
  buckets: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [assets, setAssets] = useState<MediaAssetDoc[]>(initialAssets);
  const [kindFilter, setKindFilter] = useState<MediaAssetDoc["kind"] | "all">("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MediaAssetDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = assets.filter((a) => {
    if (kindFilter !== "all" && a.kind !== kindFilter) return false;
    if (q) {
      const hay = `${a.title} ${a.caption ?? ""} ${(a.tags ?? []).join(" ")} ${a.bucket ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function startNew() {
    setEditing({
      title: "",
      kind: "photo",
      url: "",
      bucket: buckets[0] ?? "shared",
      tags: [],
      uploadedAt: new Date().toISOString(),
    } as MediaAssetDoc);
    setError(null);
  }

  function startEdit(a: MediaAssetDoc) {
    setEditing({ ...a });
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing._id;
      const url = isCreate ? "/api/media/assets" : `/api/media/assets/${editing._id}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      if (isCreate) setAssets((prev) => [data.asset, ...prev]);
      else setAssets((prev) => prev.map((a) => (a._id === data.asset._id ? data.asset : a)));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this asset? The actual file in Blob is not touched — only the metadata record.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/media/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setAssets((prev) => prev.filter((a) => a._id !== id));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-umber">
            Phase 7  ·  Pillar of Energy
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Media assets</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            Every photo, video, document, and audio file the team uses —
            searchable, taggable, and tied to states, events, and
            experiences. Files live in Vercel Blob; this is the metadata
            registry.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-gold-bright"
        >
          + Add asset
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone/40 bg-parchment p-4">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as MediaAssetDoc["kind"] | "all")}
          className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
        >
          <option value="all">All kinds</option>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <input
          placeholder="Search title, tags, caption…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
        />
        <span className="font-body text-xs text-umber">{visible.length} asset{visible.length === 1 ? "" : "s"}</span>
      </div>

      {buckets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {buckets.map((b) => (
            <span key={b} className="rounded-full bg-stone/40 px-3 py-1 font-body text-[11px] text-umber">
              📁 {b}
            </span>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-6 font-body text-sm text-ink-soft">
          No assets registered yet. Click <em>+ Add asset</em> to log your first file
          (paste the Vercel Blob URL and any caption, tags, or credits).
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => {
            const kindConfig = KINDS.find((k) => k.value === a.kind) ?? KINDS[0];
            return (
              <div key={a._id} className="rounded-2xl border border-stone/40 bg-parchment p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider ${kindConfig.tone}`}>
                      {kindConfig.label}
                    </span>
                    <h3 className="mt-2 font-display text-lg text-ink">{a.title}</h3>
                  </div>
                  {a.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbnailUrl} alt={a.title} className="h-16 w-16 rounded object-cover" />
                  ) : null}
                </div>
                {a.caption ? (
                  <p className="mt-2 font-body text-sm text-ink-soft">{a.caption}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(a.tags ?? []).map((t) => (
                    <span key={t} className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] text-umber">
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 font-mono text-[10px] text-umber">
                  {a.bucket ? `📁 ${a.bucket}` : ""}
                  {a.stateSlug ? `  ·  📍 ${a.stateSlug}` : ""}
                </div>
                {a.credit ? (
                  <p className="mt-2 font-body text-[10px] italic text-umber">© {a.credit}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                  >
                    Open file →
                  </a>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => a._id && remove(a._id)}
                      className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
            <h3 className="font-display text-2xl text-ink">
              {editing._id ? `Edit asset` : "New asset"}
            </h3>
            <div className="mt-4 space-y-3">
              <Field label="Title">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kind">
                  <select
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.kind ?? "photo"}
                    onChange={(e) => setEditing({ ...editing, kind: e.target.value as MediaAssetDoc["kind"] })}
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Bucket">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.bucket ?? ""}
                    onChange={(e) => setEditing({ ...editing, bucket: e.target.value })}
                    list="buckets-list"
                  />
                  <datalist id="buckets-list">
                    {buckets.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <Field label="URL (Vercel Blob)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                  placeholder="https://....public.blob.vercel-storage.com/..."
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                />
              </Field>
              <Field label="Thumbnail URL (optional)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                  value={editing.thumbnailUrl ?? ""}
                  onChange={(e) => setEditing({ ...editing, thumbnailUrl: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State slug">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.stateSlug ?? ""}
                    onChange={(e) => setEditing({ ...editing, stateSlug: e.target.value })}
                  />
                </Field>
                <Field label="Owner">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.owner ?? ""}
                    onChange={(e) => setEditing({ ...editing, owner: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Tags (comma-separated)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Caption / alt text">
                <textarea
                  className="h-20 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.caption ?? ""}
                  onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                />
              </Field>
              <Field label="Credit / license">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.credit ?? ""}
                  onChange={(e) => setEditing({ ...editing, credit: e.target.value })}
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
