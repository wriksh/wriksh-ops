/**
 * Library search ranking.
 *
 * Lightweight BM25-ish scorer:
 *   - tokenise the query
 *   - for each LibraryEntry, sum tf * weight for each matched token
 *     - title match: weight 3
 *     - tag match:   weight 2
 *     - heading match: weight 2.5
 *     - body match:  weight 1
 *   - return top N sorted by score desc
 *
 * The index entry is small (excerpt + body + headings + tags) so the
 * whole ranking runs in <50 ms for ~500 entries.
 */

import type { LibraryEntry } from "@/lib/library/index";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "be",
  "this",
  "that",
  "it",
]);

function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function countMatches(haystack: string, tokens: string[]): number {
  if (!haystack) return 0;
  const lower = haystack.toLowerCase();
  let n = 0;
  for (const t of tokens) {
    if (!t) continue;
    let idx = lower.indexOf(t);
    while (idx !== -1) {
      n += 1;
      idx = lower.indexOf(t, idx + t.length);
    }
  }
  return n;
}

export type RankedHit = {
  entry: LibraryEntry;
  score: number;
  /** Where the strongest match landed, for the highlighted snippet. */
  matchedIn: "title" | "tag" | "heading" | "body";
  snippet: string;
};

const SNIPPET_PAD = 100;

function buildSnippet(body: string, tokens: string[]): string {
  if (!body) return "";
  const lower = body.toLowerCase();
  let bestStart = 0;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i !== -1) {
      bestStart = Math.max(0, i - SNIPPET_PAD);
      break;
    }
  }
  const slice = body.slice(bestStart, bestStart + 240);
  return (bestStart > 0 ? "…" : "") + slice + (bestStart + 240 < body.length ? "…" : "");
}

export function searchLibrary(
  query: string,
  entries: LibraryEntry[],
  limit = 20
): RankedHit[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const hits: RankedHit[] = [];
  for (const e of entries) {
    const titleHits = countMatches(e.title, tokens);
    const tagHits = countMatches(e.tags.join(" "), tokens);
    const headingHits = countMatches(e.excerpt ?? "", tokens); // excerpt carries headings
    const bodyHits = countMatches(e.excerpt ?? "", tokens);

    const score =
      titleHits * 3 + tagHits * 2 + headingHits * 2.5 + bodyHits * 1;
    if (score === 0) continue;

    // Determine dominant match location for the snippet
    let matchedIn: RankedHit["matchedIn"] = "body";
    if (titleHits > 0) matchedIn = "title";
    else if (tagHits > 0) matchedIn = "tag";
    else if (headingHits > 0) matchedIn = "heading";

    hits.push({
      entry: e,
      score,
      matchedIn,
      snippet: buildSnippet(e.excerpt ?? e.title, tokens),
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export { tokenise };
