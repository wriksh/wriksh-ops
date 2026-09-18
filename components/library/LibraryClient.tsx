"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LibraryEntry, LibraryKind } from "@/lib/library/index";
import { searchLibrary } from "@/lib/library/search";
import { ALL_TAGS } from "@/lib/library/tags";
import LibraryDropZone from "@/components/library/DropZone";

/**
 * /library client component.
 *
 * Renders the merged index (filesystem docs + uploaded media) as a
 * searchable grid. Filters are client-side; search runs through the
 * `searchLibrary` scorer (BM25-lite, sub-50ms for ~500 entries).
 *
 * The dropzone + upload UI lives in `<LibraryDropZone>` and is wired in
 * Part B — for now we render the read-only browse experience.
 */
export default function LibraryClient({
  entries: serverEntries,
  initialQuery,
  initialSource,
  initialTag,
  initialKind,
  stats,
}: {
  entries: LibraryEntry[];
  initialQuery: string;
  initialSource: "all" | "repo" | "uploaded";
  initialTag: string;
  initialKind: string;
  stats: { total: number; repo: number; uploads: number; tags: number };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initialQuery);
  const [source, setSource] = useState<"all" | "repo" | "uploaded">(initialSource);
  const [tag, setTag] = useState<string>(initialTag);
  const [kind, setKind] = useState<string>(initialKind);
  // Local copy of entries so the dropzone can append optimistically
  // before router.refresh() lands.
  const [entries, setEntries] = useState<LibraryEntry[]>(serverEntries);

  // Re-sync when the server data changes (e.g. router.refresh after upload)
  // — only if the server set has grown, so our optimistic insert doesn't
  // get clobbered before the server response arrives.
  useMemo(() => {
    if (serverEntries.length > entries.length) setEntries(serverEntries);
  }, [serverEntries, entries.length]);

  // Build search results whenever q or filters change.
  const visible = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (source !== "all" && e.source !== source) return false;
      if (tag && !e.tags.includes(tag)) return false;
      if (kind && e.kind !== kind) return false;
      return true;
    });
    if (!q.trim()) return filtered.map((e) => ({ entry: e, score: 0, matchedIn: "body" as const, snippet: e.excerpt ?? "" }));
    return searchLibrary(q, filtered);
  }, [entries, q, source, tag, kind]);

  // Used for the tag chip cloud — top N tags by frequency.
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([t]) => t);
  }, [entries]);

  function updateUrl(next: Partial<{ q: string; source: string; tag: string; kind: string }>) {
    const params = new URLSearchParams();
    const finalQ = next.q ?? q;
    const finalSource = next.source ?? source;
    const finalTag = next.tag ?? tag;
    const finalKind = next.kind ?? kind;
    if (finalQ) params.set("q", finalQ);
    if (finalSource !== "all") params.set("source", finalSource);
    if (finalTag) params.set("tag", finalTag);
    if (finalKind) params.set("kind", finalKind);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/library?${qs}` : `/library`));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-umber">
            Phase 7  ·  Pillar of Energy
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Library</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            Repo-tracked docs and uploaded media, searchable in one place.
            Git documents ship with the codebase; uploaded media lives in
            Vercel Blob with metadata in MongoDB.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={stats.total} />
          <Stat label="Repo docs" value={stats.repo} tone="moss" />
          <Stat label="Uploads" value={stats.uploads} tone="rust" />
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone/40 bg-parchment p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search title, body, tags…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              updateUrl({ q: e.target.value });
            }}
            className="min-w-[260px] flex-1 rounded border border-stone/40 bg-linen px-3 py-2 font-body text-sm"
          />
          <div className="flex overflow-hidden rounded-full border border-stone/40">
            <SourceButton value="all" current={source} onClick={(v) => { setSource(v); updateUrl({ source: v }); }}>
              All
            </SourceButton>
            <SourceButton value="repo" current={source} onClick={(v) => { setSource(v); updateUrl({ source: v }); }}>
              Repo
            </SourceButton>
            <SourceButton value="uploaded" current={source} onClick={(v) => { setSource(v); updateUrl({ source: v }); }}>
              Uploads
            </SourceButton>
          </div>
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); updateUrl({ kind: e.target.value }); }}
            className="rounded border border-stone/40 bg-linen px-2 py-2 font-body text-xs"
          >
            <option value="">All kinds</option>
            <option value="markdown">Markdown</option>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="doc">Doc</option>
            <option value="pdf">PDF</option>
          </select>
          {tag ? (
            <button
              type="button"
              onClick={() => { setTag(""); updateUrl({ tag: "" }); }}
              className="rounded-full border border-clay px-3 py-1 font-body text-[11px] uppercase tracking-wider text-clay hover:bg-clay hover:text-linen"
            >
              ✕ Tag: {tag}
            </button>
          ) : null}
        </div>

        {/* Tag chip cloud — clicking one filters the list. */}
        <div className="flex flex-wrap gap-2">
          {topTags.length === 0 ? (
            <span className="font-body text-xs italic text-umber">No tags yet</span>
          ) : (
            topTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const next = tag === t ? "" : t;
                  setTag(next);
                  updateUrl({ tag: next });
                }}
                className={
                  "rounded-full px-3 py-1 font-body text-[11px] uppercase tracking-wider transition " +
                  (tag === t
                    ? "border border-ink bg-ink text-linen"
                    : "border border-stone/40 text-ink-soft hover:border-gold hover:text-gold")
                }
              >
                #{t}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between font-body text-xs text-umber">
          <span>
            {visible.length} {visible.length === 1 ? "item" : "items"}
            {q ? ` matching "${q}"` : ""}
            {tag ? ` tagged #${tag}` : ""}
          </span>
          {ALL_TAGS.includes(tag as never) ? null : null}
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-8 text-center font-body text-sm text-ink-soft">
          No items match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((hit) => (
            <LibraryCard
              key={hit.entry.id}
              entry={hit.entry}
              snippet={q ? hit.snippet : hit.entry.excerpt}
              highlight={hit.matchedIn}
            />
          ))}
        </div>
      )}

      <LibraryDropZone
        onUploaded={(entry) => setEntries((prev) => [entry, ...prev])}
      />

      <p className="text-center font-body text-[11px] text-umber">
        Pick a file above to upload it to the Library — or use the API at{" "}
        <code className="rounded bg-stone/40 px-1 font-mono text-[10px]">
          POST /api/library/upload
        </code>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LibraryCard({
  entry,
  snippet,
  highlight,
}: {
  entry: LibraryEntry;
  snippet?: string;
  highlight?: "title" | "tag" | "heading" | "body";
}) {
  const href = entry.source === "repo" ? `/library/${entry.slug}` : `/library/${entry.slug}`;
  const kindIcon =
    entry.kind === "markdown" ? "📄" :
    entry.kind === "photo" ? "🖼" :
    entry.kind === "video" ? "🎬" :
    entry.kind === "audio" ? "🎵" :
    entry.kind === "pdf" ? "📑" : "📎";
  const dateStr = new Date(entry.updatedAt).toLocaleDateString();

  return (
    <Link
      href={href}
      className={
        "group flex flex-col rounded-2xl border border-stone/40 bg-parchment p-5 shadow-card transition hover:border-gold/60 hover:shadow-md " +
        (highlight === "title" ? "ring-2 ring-gold/40" : "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {kindIcon}
        </span>
        <span
          className={
            "rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider " +
            (entry.source === "repo"
              ? "bg-moss/20 text-moss"
              : "bg-rust/20 text-rust")
          }
        >
          {entry.source}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg leading-tight text-ink group-hover:text-gold">
        {entry.title}
      </h3>

      {snippet ? (
        <p className="mt-2 line-clamp-3 font-body text-xs text-ink-soft">{snippet}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1">
        {entry.tags.slice(0, 5).map((t) => (
          <span
            key={t}
            className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] text-umber"
          >
            #{t}
          </span>
        ))}
        {entry.tags.length > 5 ? (
          <span className="font-body text-[10px] text-umber">+{entry.tags.length - 5}</span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 font-body text-[10px] text-umber">
        <span>
          {entry.source === "repo"
            ? `${entry.readMinutes ?? 1} min read`
            : `${formatBytes(entry.byteSize)}`}
        </span>
        <span>{dateStr}</span>
      </div>
    </Link>
  );
}

function SourceButton({
  value,
  current,
  onClick,
  children,
}: {
  value: "all" | "repo" | "uploaded";
  current: "all" | "repo" | "uploaded";
  onClick: (v: "all" | "repo" | "uploaded") => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={
        "px-3 py-2 font-body text-[11px] uppercase tracking-wider " +
        (current === value ? "bg-gold text-linen" : "bg-linen text-ink-soft")
      }
    >
      {children}
    </button>
  );
}

function Stat({ label, value, tone = "umber" }: { label: string; value: number; tone?: "moss" | "rust" | "umber" }) {
  const dot = tone === "moss" ? "bg-moss" : tone === "rust" ? "bg-rust" : "bg-umber";
  return (
    <div className="flex items-center gap-2 rounded-full border border-stone/40 bg-parchment px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-body text-[11px] uppercase tracking-wider text-umber">{label}</span>
      <span className="font-display text-base text-ink">{value}</span>
    </div>
  );
}

function formatBytes(n?: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
