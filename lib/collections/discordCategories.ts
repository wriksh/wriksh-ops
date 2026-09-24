import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type {
  DiscordMessageCategoryDoc,
  DiscordMessageReportDoc,
  DiscordInteractionLogDoc,
} from "@/lib/types";

/**
 * CRUD for the Discord-categorization collections.
 *
 * - `discord_message_categories` — one row per tagged Discord message
 * - `discord_message_reports`    — one aggregated report per day
 * - `discord_interaction_log`    — one row per slash-command invocation
 * - `cron_jobs`                   — categorize-run audit (re-uses existing collection)
 *
 * The categorize orchestrator writes here. The admin UI reads from here.
 */

const CATEGORIES = "discord_message_categories";
const REPORTS = "discord_message_reports";
const INTERACTIONS = "discord_interaction_log";

export type CategorizationCronLog = {
  jobId: string;
  kind: "manual" | "cron";
  status: "success" | "partial" | "failed";
  channelsAttempted: number;
  channelsPosted: number;
  channelsFailed: number;
  eventCount: number;
  llmSource: "minimax" | "fallback" | "skipped";
  jevModel?: string;
  jevCostUsd?: number;
  durationMs: number;
  triggeredBy?: string;
  startedAt: string;
  finishedAt: string;
};

const CRON = "cron_jobs";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** Bulk-write categorized rows. `unordered` so a duplicate `_id` is just a warning. */
export async function recordCategoryRows(
  rows: DiscordMessageCategoryDoc[]
): Promise<void> {
  if (rows.length === 0) return;
  return logger.timed(
    "discord_categories.insert",
    { count: rows.length },
    async () => {
      const db = await getDb();
      await db
        .collection<DiscordMessageCategoryDoc>(CATEGORIES)
        .insertMany(rows as unknown as DiscordMessageCategoryDoc[], {
          ordered: false,
        });
    }
  );
}

export async function listRecentCategorizedMessages(
  dateYmd: string,
  limit = 200
): Promise<DiscordMessageCategoryDoc[]> {
  return logger.timed(
    "discord_categories.list_recent",
    { dateYmd, limit },
    async () => {
      const db = await getDb();
      return db
        .collection<DiscordMessageCategoryDoc>(CATEGORIES)
        .find(
          { classifiedAt: { $regex: `^${dateYmd}` } },
          { projection: { _id: 0 } }
        )
        .sort({ messageTs: -1 })
        .limit(limit)
        .toArray() as unknown as Promise<DiscordMessageCategoryDoc[]>;
    }
  );
}

export async function listNeedsReview(
  limit = 100
): Promise<DiscordMessageCategoryDoc[]> {
  return logger.timed(
    "discord_categories.list_review",
    { limit },
    async () => {
      const db = await getDb();
      return db
        .collection<DiscordMessageCategoryDoc>(CATEGORIES)
        .find({ needsReview: true }, { projection: { _id: 0 } })
        .sort({ classifiedAt: -1 })
        .limit(limit)
        .toArray() as unknown as Promise<DiscordMessageCategoryDoc[]>;
    }
  );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function upsertReport(
  report: Omit<DiscordMessageReportDoc, "_id">
): Promise<void> {
  return logger.timed(
    "discord_reports.upsert",
    { date: report.date },
    async () => {
      const db = await getDb();
      await db
        .collection<DiscordMessageReportDoc>(REPORTS)
        .updateOne(
          { date: report.date },
          { $set: report },
          { upsert: true }
        );
    }
  );
}

export async function getReportByDate(
  dateYmd: string
): Promise<DiscordMessageReportDoc | null> {
  return logger.timed(
    "discord_reports.get_by_date",
    { dateYmd },
    async () => {
      const db = await getDb();
      const doc = await db
        .collection<DiscordMessageReportDoc>(REPORTS)
        .findOne({ date: dateYmd }, { projection: { _id: 0 } });
      return (doc as unknown as DiscordMessageReportDoc) ?? null;
    }
  );
}

export async function listRecentReports(
  limit = 14
): Promise<DiscordMessageReportDoc[]> {
  return logger.timed(
    "discord_reports.list_recent",
    { limit },
    async () => {
      const db = await getDb();
      return db
        .collection<DiscordMessageReportDoc>(REPORTS)
        .find({}, { projection: { _id: 0 } })
        .sort({ date: -1 })
        .limit(limit)
        .toArray() as unknown as Promise<DiscordMessageReportDoc[]>;
    }
  );
}

// ---------------------------------------------------------------------------
// Interaction log
// ---------------------------------------------------------------------------

export async function recordInteractionLog(
  row: Omit<DiscordInteractionLogDoc, "_id" | "loggedAt">
): Promise<void> {
  return logger.timed(
    "discord_interaction_log.insert",
    { command: row.command, ok: row.ok },
    async () => {
      const db = await getDb();
      await db.collection<DiscordInteractionLogDoc>(INTERACTIONS).insertOne({
        ...row,
        loggedAt: new Date().toISOString(),
      } as unknown as DiscordInteractionLogDoc);
    }
  );
}

export async function listRecentInteractionLogs(
  limit = 50
): Promise<DiscordInteractionLogDoc[]> {
  return logger.timed(
    "discord_interaction_log.list_recent",
    { limit },
    async () => {
      const db = await getDb();
      return db
        .collection<DiscordInteractionLogDoc>(INTERACTIONS)
        .find({}, { projection: { _id: 0 } })
        .sort({ loggedAt: -1 })
        .limit(limit)
        .toArray() as unknown as Promise<DiscordInteractionLogDoc[]>;
    }
  );
}

// ---------------------------------------------------------------------------
// Cron audit (lives in the existing `cron_jobs` collection)
// ---------------------------------------------------------------------------

export async function recordCategorizationCron(
  row: CategorizationCronLog
): Promise<void> {
  return logger.timed(
    "cron_jobs.record_categorize",
    { kind: row.kind, status: row.status },
    async () => {
      const db = await getDb();
      await db.collection<CategorizationCronLog>(CRON).insertOne({
        ...row,
        jobId: `discord-categorize-${row.jobId}`,
      } as unknown as CategorizationCronLog);
    }
  );
}

export async function listRecentCategorizationCronRuns(
  limit = 20
): Promise<CategorizationCronLog[]> {
  return logger.timed(
    "cron_jobs.list_categorize",
    { limit },
    async () => {
      const db = await getDb();
      return db
        .collection<CategorizationCronLog>(CRON)
        .find({ jobId: { $regex: "^discord-categorize-" } })
        .sort({ startedAt: -1 })
        .limit(limit)
        .toArray() as unknown as Promise<CategorizationCronLog[]>;
    }
  );
}
