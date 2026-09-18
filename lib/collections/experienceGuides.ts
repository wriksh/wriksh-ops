import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { ExperienceGuideDoc, LearnHostDoc } from "@/lib/types";

/** Phase 6 — count accessors for the dashboard tiles. */

export async function countExperienceGuides(): Promise<number> {
  return logger.timed("experience_guides.count", {}, async () => {
    const db = await getDb();
    return db.collection<ExperienceGuideDoc>("experience_guides").countDocuments({});
  });
}

export async function countLearnHosts(): Promise<number> {
  return logger.timed("learn_hosts.count", {}, async () => {
    const db = await getDb();
    return db.collection<LearnHostDoc>("learn_hosts").countDocuments({});
  });
}
