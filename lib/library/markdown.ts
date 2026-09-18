/**
 * Library markdown helpers.
 *
 * Pure functions over a markdown string:
 *   - extractHeadings(md) — returns H1/H2/H3 + slug for the TOC
 *   - firstExcerpt(md, n) — strips front-matter + leading heading, takes
 *     the first N chars of plain text, used for card previews
 *   - wordCount + readingMinutes
 *   - stripMarkdown(md) — remove syntax for full-text search
 */

export type Heading = { depth: 1 | 2 | 3 | 4 | 5 | 6; text: string; slug: string };

export function extractHeadings(markdown: string): Heading[] {
  const out: Heading[] = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const depth = m[1].length as Heading["depth"];
    const text = m[2].trim();
    out.push({ depth, text, slug: slugifyHeading(text) });
  }
  return out;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip markdown syntax for plain-text search / excerpts. */
export function stripMarkdown(md: string): string {
  return md
    // Remove code fences
    .replace(/```[\s\S]*?```/g, " ")
    // Remove inline code
    .replace(/`[^`]*`/g, " ")
    // Images and links
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Headings / blockquotes / list markers
    .replace(/^[#>\-*+]+\s+/gm, "")
    // Bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // HTML tags
    .replace(/<[^>]+>/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(md: string): number {
  return stripMarkdown(md).split(/\s+/).filter(Boolean).length;
}

/** Approximate reading time in minutes (200 wpm). */
export function readingMinutes(md: string): number {
  const w = wordCount(md);
  return Math.max(1, Math.round(w / 200));
}

/** First N chars of plain-text content, skipping front-matter + the first heading. */
export function firstExcerpt(md: string, n = 240): string {
  const cleaned = stripMarkdown(md);
  if (cleaned.length <= n) return cleaned;
  // Cut at the nearest word boundary
  const slice = cleaned.slice(0, n);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 80 ? slice.slice(0, lastSpace) : slice) + "…";
}
