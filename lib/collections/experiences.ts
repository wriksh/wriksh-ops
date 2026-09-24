import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { ExperienceDoc } from "@/lib/types";

/**
 * Read-only access to wriksh-dev's `experiences` collection.
 *
 * The experiences list powers `/experiences` on wriksh-dev and — as of the
 * tabs pass — also powers the `experiences` PDF generated from wriksh-ops.
 * Admin CRUD lives in wriksh-dev; here we only read.
 */
export async function listExperiencesForState(
  stateSlug: string
): Promise<ExperienceDoc[]> {
  return logger.timed(
    "experiences.listForState",
    { stateSlug },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<ExperienceDoc>("experiences")
        .find({ stateSlug, status: { $ne: "draft" } }, { projection: { _id: 0 } })
        .sort({ title: 1 })
        .toArray();
      return docs;
    }
  );
}

/** Fetch a single experience by slug — used by the admin UI. */
export async function getExperienceBySlug(
  slug: string
): Promise<ExperienceDoc | undefined> {
  return logger.timed("experiences.getBySlug", { slug }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<ExperienceDoc>("experiences")
      .findOne({ slug }, { projection: { _id: 0 } });
    return doc ?? undefined;
  });
}
