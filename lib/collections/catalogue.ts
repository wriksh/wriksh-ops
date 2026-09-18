import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type {
  CatalogueOverrideDoc,
  CatalogueSectionSlug,
  CatalogueJobDoc,
  ContentStatus,
} from "@/lib/types";

/**
 * CRUD for catalogue-specific configuration & audit trail.
 *
 * `catalogue_overrides` — per-state intro / section ordering copy. Lets
 * the catalogue render differently for, say, a Cultural-Department
 * proposal vs. the default state catalogue, without changing the
 * underlying states / traditions / festivals collections.
 *
 * `catalogue_jobs` — every time we render a PDF we drop a row here so the
 * Dhoomkethu dashboard can show "last generated, by whom, how big".
 */

const DEFAULT_SECTION_ORDER: CatalogueSectionSlug[] = [
  "welcome",
  "story",
  "dance",
  "music",
  "theatre",
  "craft",
  "martial",
  "festivals",
  "providers",
];

export async function getCatalogueOverride(
  stateSlug: string
): Promise<CatalogueOverrideDoc | undefined> {
  return logger.timed(
    "catalogue_overrides.get",
    { stateSlug },
    async () => {
      const db = await getDb();
      const doc = await db
        .collection<CatalogueOverrideDoc>("catalogue_overrides")
        .findOne({ stateSlug }, { projection: { _id: 0 } });
      return doc ?? undefined;
    }
  );
}

export async function listCatalogueOverrides(): Promise<CatalogueOverrideDoc[]> {
  return logger.timed("catalogue_overrides.list", {}, async () => {
    const db = await getDb();
    return db
      .collection<CatalogueOverrideDoc>("catalogue_overrides")
      .find({}, { projection: { _id: 0 } })
      .sort({ stateSlug: 1 })
      .toArray();
  });
}

export async function upsertCatalogueOverride(
  stateSlug: string,
  input: Omit<CatalogueOverrideDoc, "stateSlug" | "updatedAt">
): Promise<CatalogueOverrideDoc> {
  return logger.timed(
    "catalogue_overrides.upsert",
    { stateSlug },
    async () => {
      const db = await getDb();
      const now = new Date().toISOString();
      const doc: CatalogueOverrideDoc = {
        stateSlug,
        ...input,
        sectionOrder: input.sectionOrder ?? DEFAULT_SECTION_ORDER,
        status: input.status ?? ("published" as ContentStatus),
        updatedAt: now,
      };
      await db
        .collection<CatalogueOverrideDoc>("catalogue_overrides")
        .updateOne({ stateSlug }, { $set: doc }, { upsert: true });
      return doc;
    }
  );
}

/** Audit-log a successful PDF render. */
export async function recordCatalogueJob(
  job: Omit<CatalogueJobDoc, "generatedAt">
): Promise<void> {
  return logger.timed("catalogue_jobs.record", { stateSlug: job.stateSlug }, async () => {
    const db = await getDb();
    await db.collection<CatalogueJobDoc>("catalogue_jobs").insertOne({
      ...job,
      generatedAt: new Date().toISOString(),
    });
  });
}

export async function listRecentCatalogueJobs(limit = 20): Promise<CatalogueJobDoc[]> {
  return logger.timed("catalogue_jobs.list", { limit }, async () => {
    const db = await getDb();
    return db
      .collection<CatalogueJobDoc>("catalogue_jobs")
      .find({}, { projection: { _id: 0 } })
      .sort({ generatedAt: -1 })
      .limit(limit)
      .toArray();
  });
}

export { DEFAULT_SECTION_ORDER };
