import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { TraditionDoc } from "@/lib/types";

/** Read-only access to wriksh-dev's `traditions` collection. */

export async function listTraditionsForState(stateSlug: string): Promise<TraditionDoc[]> {
  return logger.timed(
    "traditions.listForState",
    { stateSlug },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<TraditionDoc>("traditions")
        .find({ stateSlug, status: { $ne: "draft" } }, { projection: { _id: 0 } })
        .sort({ name: 1 })
        .toArray();
      return docs;
    }
  );
}
