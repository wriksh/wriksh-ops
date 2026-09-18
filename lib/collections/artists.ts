import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { DiscoverArtistDoc, TenderDoc } from "@/lib/types";

/**
 * Discover-artist + tender accessors (Phase 5).
 *
 * The dashboard only needs counts today; the full matching algorithm lands
 * in Phase 5 proper (price + distance + past-performance cosine similarity).
 */

export async function countArtists(): Promise<number> {
  return logger.timed("discover_artists.count", {}, async () => {
    const db = await getDb();
    return db.collection<DiscoverArtistDoc>("discover_artists").countDocuments({});
  });
}

export async function countTenders(): Promise<{
  total: number;
  open: number;
}> {
  return logger.timed("tenders.count", {}, async () => {
    const db = await getDb();
    const [total, open] = await Promise.all([
      db.collection<TenderDoc>("tenders").countDocuments({}),
      db.collection<TenderDoc>("tenders").countDocuments({ status: "open" }),
    ]);
    return { total, open };
  });
}
