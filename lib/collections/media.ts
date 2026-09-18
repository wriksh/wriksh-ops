import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { MediaAssetDoc } from "@/lib/types";

/** Phase 7 — count accessor for the media-assets tile. */

export async function countMediaAssets(): Promise<number> {
  return logger.timed("media_assets.count", {}, async () => {
    const db = await getDb();
    return db.collection<MediaAssetDoc>("media_assets").countDocuments({});
  });
}
