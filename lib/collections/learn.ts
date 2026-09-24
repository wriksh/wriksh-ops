import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { LearnDoc } from "@/lib/types";

/**
 * Read-only access to wriksh-dev's `learn` collection.
 *
 * `learn` holds long-form, multi-week training programs (TTCs, residencies,
 * apprenticeships) — distinct from `experiences` which is short-form. The
 * collection is owned by wriksh-dev; here we only read so we can render
 * the `learn` PDF from wriksh-ops.
 */
export async function listLearnForState(
  stateSlug: string
): Promise<LearnDoc[]> {
  return logger.timed(
    "learn.listForState",
    { stateSlug },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<LearnDoc>("learn")
        .find({ stateSlug, status: { $ne: "draft" } }, { projection: { _id: 0 } })
        .sort({ title: 1 })
        .toArray();
      return docs;
    }
  );
}

/** Fetch a single learn entry by slug — used by the admin UI. */
export async function getLearnBySlug(
  slug: string
): Promise<LearnDoc | undefined> {
  return logger.timed("learn.getBySlug", { slug }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<LearnDoc>("learn")
      .findOne({ slug }, { projection: { _id: 0 } });
    return doc ?? undefined;
  });
}
