import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { ProviderDoc } from "@/lib/types";

/** Read-only access to wriksh-dev's `providers` collection. */

export async function listProvidersForState(stateSlug: string): Promise<ProviderDoc[]> {
  return logger.timed(
    "providers.listForState",
    { stateSlug },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<ProviderDoc>("providers")
        .find({ stateSlug, status: { $ne: "draft" } }, { projection: { _id: 0 } })
        .sort({ name: 1 })
        .toArray();
      return docs;
    }
  );
}
