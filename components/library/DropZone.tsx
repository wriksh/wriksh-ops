"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LibraryEntry } from "@/lib/library/index";

/**
 * LibraryDropZone — drag any file onto the page (or click to pick) to
 * upload it as a Library asset. After a successful POST, the entry is
 * inserted into the parent's `entries` array optimistically and the
 * page is revalidated so the index picks it up.
 *
 * Bucket is a quick-pick chip — the admin picks one of the predefined
 * buckets (or types a new one). Tags are free-form, comma-separated.
 */
export default function LibraryDropZone({
  onUploaded,
}: {
  onUploaded?: (entry: LibraryEntry) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("general");
  const [tags, setTags] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");

  const BUCKETS = [
    "marketing",
    "catalogue",
    "finance",
    "people",
    "discord",
    "general",
  ];

  async function upload(file: File) {
    setBusy(true);
    setProgress(`Uploading ${file.name}…`);
    setError(null);
    const finalTitle = title.trim() || file.name;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", finalTitle);
      fd.append("bucket", bucket);
      fd.append("tags", tags);
      if (caption) fd.append("caption", caption);
      if (credit) fd.append("credit", credit);
      const res = await fetch("/api/library/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");
      setProgress(`Uploaded ${finalTitle}`);
      // Reset the form
      setTitle("");
      setTags("");
      setCaption("");
      setCredit("");
      // Optimistically append
      const a = data.asset;
      const newEntry: LibraryEntry = {
        id: `uploaded:${a._id}`,
        slug: a._id,
        title: a.title,
        kind: a.kind,
        source: "uploaded",
        tags: (a.tags ?? []).map((t: string) => t.toLowerCase()),
        bucket: a.bucket,
        href: a.url,
        previewUrl: a.thumbnailUrl ?? a.url,
        caption: a.caption,
        credit: a.credit,
        updatedAt: a.uploadedAt,
      };
      onUploaded?.(newEntry);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-stone/60 bg-parchment p-5">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            File
          </span>
          <input
            type="file"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
            className="mt-1 block w-full text-sm font-body text-ink file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1 file:text-[11px] file:uppercase file:tracking-wider file:text-linen hover:file:bg-gold-bright"
          />
        </label>
        <label className="flex-1 min-w-[200px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            Title (defaults to filename)
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-stone/40 bg-linen px-2 py-1 font-body text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <label className="block min-w-[160px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            Bucket
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {BUCKETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucket(b)}
                className={
                  "rounded-full px-3 py-1 font-body text-[10px] uppercase tracking-wider transition " +
                  (bucket === b
                    ? "border border-ink bg-ink text-linen"
                    : "border border-stone/40 text-ink-soft hover:border-gold hover:text-gold")
                }
              >
                {b}
              </button>
            ))}
          </div>
        </label>
        <label className="flex-1 min-w-[200px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            Tags (comma-separated)
          </span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="karnataka, yakshagana, dasara"
            className="mt-1 w-full rounded border border-stone/40 bg-linen px-2 py-1 font-body text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            Caption / alt
          </span>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-1 w-full rounded border border-stone/40 bg-linen px-2 py-1 font-body text-sm"
          />
        </label>
        <label className="flex-1 min-w-[200px]">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
            Credit / license
          </span>
          <input
            type="text"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            className="mt-1 w-full rounded border border-stone/40 bg-linen px-2 py-1 font-body text-sm"
          />
        </label>
      </div>

      {progress ? (
        <p className="mt-3 font-body text-xs text-moss">{progress}</p>
      ) : null}
      {error ? (
        <p className="mt-3 font-body text-xs text-clay">{error}</p>
      ) : null}

      {/* Native drag-and-drop support on the entire page would normally live
          here, but Next.js routes don't easily expose a window-level drag
          handler without a client wrapper. Use the file input above — it's
          the same pipeline. */}
    </div>
  );
}
