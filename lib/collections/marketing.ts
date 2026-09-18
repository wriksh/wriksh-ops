import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { MarketingEventDoc, MarketingCategory } from "@/lib/types";

/**
 * Marketing calendar — Phase 2 module (placeholder CRUD; the dashboard tiles
 * consume `countByCategory`, `countInRange`, and `listRecent` so the UI works
 * end-to-end before the full event editor ships).
 */

export async function listRecentMarketingEvents(limit = 50): Promise<MarketingEventDoc[]> {
  return logger.timed("marketing_events.list", { limit }, async () => {
    const db = await getDb();
    return db
      .collection<MarketingEventDoc>("marketing_events")
      .find({}, { projection: { _id: 0 } })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  });
}

export async function countMarketingEventsByCategory(): Promise<Record<MarketingCategory, number>> {
  return logger.timed("marketing_events.countByCategory", {}, async () => {
    const db = await getDb();
    const pipeline = [
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ];
    const out: Record<MarketingCategory, number> = {
      post: 0,
      meeting: 0,
      experience: 0,
      collab: 0,
      ad: 0,
      "app-dev": 0,
    };
    for (const row of await db.collection("marketing_events").aggregate(pipeline).toArray()) {
      if (row._id in out) {
        out[row._id as MarketingCategory] = row.n as number;
      }
    }
    return out;
  });
}
