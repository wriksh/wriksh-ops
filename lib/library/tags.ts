/**
 * Library tag taxonomy + path-based inference.
 *
 * Every Library entry is auto-tagged using these rules so authors don't
 * have to write front-matter everywhere. Manual tags (entered in the
 * upload UI, or written as front-matter `tags:` in markdown) are merged
 * on top — duplicates removed.
 *
 * Keep this list stable: changing a tag here silently re-classifies
 * every existing repo doc on the next request.
 */

export type LibraryTag =
  | "docs"            // all repo-tracked markdown
  | "philosophy"      // WRIKSH.md
  | "brand"
  | "operations"
  | "engineering"
  | "marketing"
  | "catalogue"
  | "finance"
  | "people"
  | "discord"
  | "general";

export const ALL_TAGS: LibraryTag[] = [
  "docs",
  "philosophy",
  "brand",
  "operations",
  "engineering",
  "marketing",
  "catalogue",
  "finance",
  "people",
  "discord",
  "general",
];

/**
 * Derive the auto-tag set for a filesystem-relative path like
 * "docs/operations/runbook.md" or "WRIKSH.md".
 *
 * Returns tags in priority order (the most specific first); the UI
 * dedupes.
 */
export function inferTagsFromPath(relPath: string): LibraryTag[] {
  const out: LibraryTag[] = ["docs"];
  const norm = relPath.replace(/\\/g, "/").toLowerCase();

  if (norm === "wriksh.md") out.push("philosophy");
  if (norm.includes("brand")) out.push("brand");
  if (norm.includes("oper") || norm.includes("runbook")) out.push("operations");
  if (norm.includes("engineer") || norm.includes("ci") || norm.includes("test")) {
    out.push("engineering");
  }
  if (norm.includes("market")) out.push("marketing");
  if (norm.includes("catalogue")) out.push("catalogue");
  if (norm.includes("finance")) out.push("finance");
  if (norm.includes("people")) out.push("people");
  if (norm.includes("discord")) out.push("discord");

  return out;
}

/**
 * Optional YAML front-matter parser — extremely small. Only supports the
 * subset we need: `title`, `tags`, `bucket`. If the file doesn't start
 * with `---`, returns an empty record.
 */
export type FrontMatter = {
  title?: string;
  tags?: string[];
  bucket?: string;
};

export function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const meta: FrontMatter = {};
  for (const line of head.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    let value = m[2].trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === "title") meta.title = value;
    else if (key === "tags") {
      // Allow either inline list `[a, b, c]` or comma-separated `a, b, c`
      const cleaned = value.replace(/^\[|\]$/g, "");
      meta.tags = cleaned
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (key === "bucket") meta.bucket = value;
  }
  return { meta, body };
}

/** Merge inferred tags + manual tags, deduplicated, preserving order. */
export function mergeTags(inferred: string[], manual: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...inferred, ...manual]) {
    const k = t.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
