import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { StateDoc } from "@/lib/types";

/**
 * Read-only access to the `states` collection owned by wriksh-dev.
 *
 * Each function logs the action with timing so we can spot slow Mongo
 * queries in production.
 */

export async function listStates(): Promise<StateDoc[]> {
  return logger.timed(
    "states.list",
    {},
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<StateDoc>("states")
        .find({}, { projection: { _id: 0 } })
        .sort({ order: 1, name: 1 })
        .toArray();
      return docs;
    }
  );
}

export async function getStateBySlug(slug: string): Promise<StateDoc | undefined> {
  return logger.timed(
    "states.getBySlug",
    { slug },
    async () => {
      const db = await getDb();
      const doc = await db
        .collection<StateDoc>("states")
        .findOne({ slug }, { projection: { _id: 0 } });
      return doc ?? undefined;
    }
  );
}
