import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

/**
 * Audit log for cron runs.
 *
 * Every time the daily reminder (or any future cron) runs we drop a
 * row here. The admin UI's "cron status" card reads the most recent
 * N rows to show "last 10 runs" + per-channel success.
 *
 * Per-run summary fields are intentionally denormalized for fast dashboard
 * rendering — if we ever need per-channel details, switch to a separate
 * `cron_job_runs` collection keyed by `jobId`.
 */

export type CronJobDoc = {
  jobId: string;
  kind: "daily-reminder" | "manual";
  status: "success" | "partial" | "failed";
  /** Number of channels we attempted to post to. */
  channelsAttempted: number;
  channelsPosted: number;
  channelsFailed: number;
  /** Marketing events included in the digest. */
  eventCount: number;
  /** Did MiniMax succeed? "minimax" | "fallback" | "skipped". */
  llmSource: "minimax" | "fallback" | "skipped";
  /** Optional error message (truncated). */
  error?: string;
  durationMs: number;
  /** True if this run was triggered manually from the admin UI. */
  triggeredBy?: string;
  startedAt: string;
  finishedAt: string;
};

const COLLECTION = "cron_jobs";

export async function recordCronRun(doc: CronJobDoc): Promise<void> {
  return logger.timed(
    "cron_jobs.record",
    { kind: doc.kind, status: doc.status },
    async () => {
      const db = await getDb();
      await db.collection<CronJobDoc>(COLLECTION).insertOne(doc);
    }
  );
}

export async function listRecentCronRuns(limit = 20): Promise<CronJobDoc[]> {
  return logger.timed("cron_jobs.list", { limit }, async () => {
    const db = await getDb();
    return db
      .collection<CronJobDoc>(COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  });
}

export async function getLastCronRun(kind: CronJobDoc["kind"] = "daily-reminder"): Promise<CronJobDoc | undefined> {
  return logger.timed("cron_jobs.last", { kind }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<CronJobDoc>(COLLECTION)
      .findOne({ kind }, { projection: { _id: 0 }, sort: { startedAt: -1 } });
    return doc ?? undefined;
  });
}
