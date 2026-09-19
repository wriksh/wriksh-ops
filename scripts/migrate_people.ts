/**
 * scripts/migrate_people.ts
 *
 * One-shot migration: copy every row from `discover_artists`,
 * `experience_guides`, and `learn_hosts` into the unified `people`
 * collection. Derives roles[] and tags[] automatically.
 *
 * Idempotent: skips slugs that already exist in `people`.
 *
 * Run:
 *   npm run migrate:people
 */

import "dotenv/config";
import { getDb } from "../lib/mongodb";
import {
  listDiscoverArtists,
} from "../lib/collections/artists";
import { listExperienceGuides, listLearnHosts } from "../lib/collections/experienceGuides";
import {
  createPerson,
  derivePersonFromLegacy,
  type LegacySource,
  type LegacyDoc,
} from "../lib/collections/people";
import { logger } from "../lib/logger";

async function migrate<T extends { slug: string }>(
  source: LegacySource,
  fetch: () => Promise<T[]>
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  const existing = new Set(
    (await db.collection("people").distinct("slug")) as string[]
  );
  const items = await fetch();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const raw of items) {
    if (existing.has(raw.slug)) {
      skipped += 1;
      continue;
    }
    try {
      await createPerson(derivePersonFromLegacy(source, raw as unknown as LegacyDoc));
      inserted += 1;
    } catch (err) {
      errors.push(`${source}/${raw.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { inserted, skipped, errors };
}

async function main() {
  const out: Record<string, unknown> = {};
  out.discover_artists = await migrate("discover_artists", () => listDiscoverArtists());
  out.experience_guides = await migrate("experience_guides", () => listExperienceGuides());
  out.learn_hosts = await migrate("learn_hosts", () => listLearnHosts());

  console.log("Migration complete:");
  console.log(JSON.stringify(out, null, 2));
  logger.info("migrate_people.done", out);
}

main().catch((err) => {
  logger.error("migrate_people.fail", { reason: String(err) });
  process.exit(1);
});
