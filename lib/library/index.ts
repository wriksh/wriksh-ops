/**
 * Library index — filesystem docs + Mongo media_assets merged into a
 * single `LibraryEntry[]`.
 *
 * The filesystem walk is cheap (<50 ms for ~50 files), so we rebuild on
 * every request. If we ever cross ~500 entries or 5 MB total content,
 * add an in-process LRU keyed on `(filters, query)`.
 *
 * Read-side only — upload writes go through `/api/library/upload`,
 * which inserts a `media_assets` row; the next `buildLibraryIndex()`
 * call picks it up automatically.
 */

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "@/lib/logger";
import {
  inferTagsFromPath,
  parseFrontMatter,
  mergeTags,
} from "@/lib/library/tags";
import {
  extractHeadings,
  firstExcerpt,
  readingMinutes,
  wordCount,
} from "@/lib/library/markdown";
import { listMediaAssets } from "@/lib/collections/media";
import type { MediaAssetDoc } from "@/lib/types";

export type LibraryKind = MediaAssetDoc["kind"] | "markdown";

export type LibraryEntrySource = "repo" | "uploaded";

export type LibraryEntry = {
  /** Stable id: "repo:<slug>" or "uploaded:<mongo-id>". */
  id: string;
  /** URL-safe slug (relative path within library). */
  slug: string;
  title: string;
  kind: LibraryKind;
  source: LibraryEntrySource;
  tags: string[];
  bucket?: string;
  /** Repo docs: filesystem path. Uploads: blob URL. */
  href: string;
  /** Inline preview URL (uploads only). */
  previewUrl?: string;
  /** For repo docs: first ~240 chars of plain text. Used for snippet + search. */
  excerpt?: string;
  /** For repo docs: extracted H1/H2/H3 list. */
  headings?: { depth: 1 | 2 | 3; text: string; slug: string }[];
  wordCount?: number;
  readMinutes?: number;
  byteSize?: number;
  caption?: string;
  credit?: string;
  /** Mtime for repo docs; uploadedAt for media. */
  updatedAt: string;
};

const DOCS_ROOT = path.join(process.cwd(), "docs");

// ---------------------------------------------------------------------------
// Filesystem walk
// ---------------------------------------------------------------------------

async function walkDocs(root: string): Promise<string[]> {
  const out: string[] = [];
  async function visit(dir: string) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        await visit(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        out.push(full);
      }
    }
  }
  await visit(root);
  return out;
}

function relSlug(absPath: string): string {
  return path
    .relative(DOCS_ROOT, absPath)
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "");
}

async function buildRepoEntry(absPath: string): Promise<LibraryEntry> {
  const stat = await fs.stat(absPath);
  const raw = await fs.readFile(absPath, "utf8");
  const { meta, body } = parseFrontMatter(raw);
  const rel = relSlug(absPath);
  const inferredTags = inferTagsFromPath(rel);
  const tags = mergeTags(inferredTags, meta.tags ?? []);
  const headings = extractHeadings(body)
    .filter((h) => h.depth <= 3)
    .map((h) => ({ depth: h.depth as 1 | 2 | 3, text: h.text, slug: h.slug }));
  const title =
    meta.title ??
    headings.find((h) => h.depth === 1)?.text ??
    prettyTitleFromSlug(rel);

  return {
    id: `repo:${rel}`,
    slug: rel,
    title,
    kind: "markdown",
    source: "repo",
    tags,
    bucket: meta.bucket ?? bucketFromTags(tags),
    href: rel, // resolved against DOCS_ROOT in the reader
    excerpt: firstExcerpt(body, 240),
    headings,
    wordCount: wordCount(body),
    readMinutes: readingMinutes(body),
    updatedAt: stat.mtime.toISOString(),
  };
}

function bucketFromTags(tags: string[]): string | undefined {
  for (const t of tags) {
    if (t === "docs") continue;
    return t;
  }
  return undefined;
}

function prettyTitleFromSlug(slug: string): string {
  return slug
    .split("/")
    .pop()!
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Upload → LibraryEntry
// ---------------------------------------------------------------------------

function buildUploadedEntry(a: MediaAssetDoc): LibraryEntry | null {
  if (!a._id) return null;
  return {
    id: `uploaded:${a._id}`,
    slug: a._id, // detail page uses _id
    title: a.title,
    kind: a.kind,
    source: "uploaded",
    tags: (a.tags ?? []).map((t) => t.toLowerCase()),
    bucket: a.bucket,
    href: a.url,
    previewUrl: a.thumbnailUrl ?? a.url,
    caption: a.caption,
    credit: a.credit,
    byteSize: undefined, // could be filled by blob head() but skipped for now
    updatedAt: a.uploadedAt,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildLibraryIndex(): Promise<LibraryEntry[]> {
  return logger.timed("library.index.build", {}, async () => {
    const [docFiles, assets] = await Promise.all([
      walkDocs(DOCS_ROOT),
      listMediaAssets({}).catch((err) => {
        logger.warn("library.index.mediaFetchFailed", {
          reason: err instanceof Error ? err.message : String(err),
        });
        return [] as MediaAssetDoc[];
      }),
    ]);

    const repoEntries = await Promise.all(docFiles.map(buildRepoEntry));
    const uploadEntries = assets
      .map(buildUploadedEntry)
      .filter((e): e is LibraryEntry => e !== null);

    return [...repoEntries, ...uploadEntries].sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1
    );
  });
}

export async function getLibraryEntry(slug: string): Promise<LibraryEntry | undefined> {
  const all = await buildLibraryIndex();
  // Repo entries: slug = rel path. Uploaded entries: slug = _id.
  return all.find((e) => e.slug === slug || e.id === `uploaded:${slug}`);
}

export async function readRepoMarkdown(slug: string): Promise<string | undefined> {
  // Only repo docs are served from disk.
  if (slug.includes("..") || path.isAbsolute(slug)) return undefined;
  const abs = path.join(DOCS_ROOT, `${slug}.md`);
  try {
    return await fs.readFile(abs, "utf8");
  } catch {
    return undefined;
  }
}
