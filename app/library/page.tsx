import { buildLibraryIndex } from "@/lib/library/index";
import LibraryClient from "@/components/library/LibraryClient";

/**
 * /library — unified knowledge base.
 *
 * Server-fetches the merged index (filesystem docs + media_assets), then
 * hands off to the client component for the search + filter UI.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: { q?: string; tag?: string; source?: "repo" | "uploaded" | "all"; kind?: string };
}) {
  const all = await buildLibraryIndex();

  // Aggregate stats for the header
  const repoCount = all.filter((e) => e.source === "repo").length;
  const uploadCount = all.filter((e) => e.source === "uploaded").length;
  const tagSet = new Set<string>();
  for (const e of all) for (const t of e.tags) tagSet.add(t);

  return (
    <LibraryClient
      entries={all}
      initialQuery={searchParams?.q ?? ""}
      initialSource={searchParams?.source ?? "all"}
      initialTag={searchParams?.tag ?? ""}
      initialKind={searchParams?.kind ?? ""}
      stats={{
        total: all.length,
        repo: repoCount,
        uploads: uploadCount,
        tags: tagSet.size,
      }}
    />
  );
}
