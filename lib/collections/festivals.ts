import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { FestivalDoc } from "@/lib/types";

/** Read-only access to wriksh-dev's `festivals` collection. */

export async function listFestivalsForState(stateSlug: string): Promise<FestivalDoc[]> {
  return logger.timed(
    "festivals.listForState",
    { stateSlug },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<FestivalDoc>("festivals")
        .find(
          { stateSlugs: stateSlug, status: { $ne: "draft" } },
          { projection: { _id: 0 } }
        )
        .sort({ startDate: 1, month: 1 })
        .toArray();
      return docs;
    }
  );
}
