import { NextResponse } from "next/server";
import { buildLibraryIndex } from "@/lib/library/index";
import { searchLibrary } from "@/lib/library/search";

/**
 * GET /api/library/search?q=...
 *
 * Server-side search across the merged index. Used by the search input
 * for live results when the URL is not yet updated, and is also the
 * canonical endpoint for any future integrations (Slack bot, etc.).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const source = (url.searchParams.get("source") ?? "all") as "all" | "repo" | "uploaded";
  const tag = url.searchParams.get("tag") ?? "";
  const kind = url.searchParams.get("kind") ?? "";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

  const all = await buildLibraryIndex();
  const filtered = all.filter((e) => {
    if (source !== "all" && e.source !== source) return false;
    if (tag && !e.tags.includes(tag)) return false;
    if (kind && e.kind !== kind) return false;
    return true;
  });
  const hits = q.trim() ? searchLibrary(q, filtered, limit) : filtered.slice(0, limit).map((e) => ({
    entry: e,
    score: 0,
    matchedIn: "body" as const,
    snippet: e.excerpt ?? "",
  }));

  return NextResponse.json({ q, source, tag, kind, count: hits.length, hits });
}
