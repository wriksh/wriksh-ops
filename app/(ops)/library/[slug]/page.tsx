import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLibraryEntry, readRepoMarkdown } from "@/lib/library/index";
import DocReader from "@/components/library/DocReader";
import AssetPreview from "@/components/library/AssetPreview";

/**
 * /library/[slug] — detail page.
 *
 * Slugs:
 *   - Repo docs: relative path within `docs/` (e.g. "operations/runbook")
 *   - Uploads:   the Mongo _id string
 */
export default async function LibraryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const entry = await getLibraryEntry(decodeURIComponent(params.slug));
  if (!entry) return notFound();

  if (entry.source === "repo") {
    const body = await readRepoMarkdown(entry.slug);
    if (body == null) return notFound();
    return (
      <DocReader
        entry={entry}
        body={body}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/library"
        className="inline-block font-body text-xs uppercase tracking-[0.24em] text-gold hover:text-gold-bright"
      >
        ← Library
      </Link>
      <header className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rust/20 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-rust">
            uploaded · {entry.kind}
          </span>
          {entry.bucket ? (
            <span className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-umber">
              📁 {entry.bucket}
            </span>
          ) : null}
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] text-umber"
            >
              #{t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 font-display text-3xl text-ink">{entry.title}</h1>
        {entry.caption ? (
          <p className="mt-2 font-body text-sm text-ink-soft">{entry.caption}</p>
        ) : null}
        {entry.credit ? (
          <p className="mt-1 font-body text-[11px] italic text-umber">© {entry.credit}</p>
        ) : null}
      </header>
      <AssetPreview entry={entry} />
      <footer className="rounded-2xl border border-stone/40 bg-parchment p-4 font-body text-xs text-umber">
        Open the original file:{" "}
        <a
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-gold hover:text-gold-bright"
        >
          {entry.href}
        </a>
      </footer>
    </div>
  );
}
