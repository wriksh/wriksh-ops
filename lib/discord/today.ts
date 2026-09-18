import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { MarketingEventDoc, FinanceTransactionDoc } from "@/lib/types";
import { MARKETING_CATEGORY_LABELS } from "@/lib/types";

/**
 * "Today at Wriksh" data fetcher.
 *
 * Pure read — pulls events / finance / catalogue_jobs from MongoDB and
 * returns a single struct that both the cron and the bot can render into
 * a Discord payload. All time comparisons are done in the timezone passed
 * in (default Asia/Kolkata) so the cron running on a UTC server still
 * reports "today" correctly for the Indian team.
 */

export type TodayContext = {
  /** ISO date (YYYY-MM-DD) of "today" in the configured TZ. */
  today: string;
  /** Human-readable today, e.g. "Friday 19 September 2026". */
  todayHuman: string;
  /** Marketing events scheduled for today, sorted by time. */
  eventsToday: MarketingEventDoc[];
  /** Marketing events in-progress today (start <= today <= end). */
  eventsOngoing: MarketingEventDoc[];
  /** Counts by category — derived from eventsToday + eventsOngoing. */
  byCategory: Record<string, number>;
  /** Catalogue PDFs rendered in the last 24 hours. */
  catalogueJobsRecent: number;
  /** Sum of inbound finance tx in the last 24 hours (INR). */
  financeLast24hIncome: number;
  /** Sum of outbound finance tx in the last 24 hours (INR). */
  financeLast24hExpense: number;
  /** Net of the above. */
  financeLast24hNet: number;
  /** Number of finance transactions in the last 24 hours. */
  financeLast24hCount: number;
  /** ISO timestamp of when this struct was assembled. */
  assembledAt: string;
  /** Timezone used for "today" boundaries. */
  tz: string;
};

const DEFAULT_TZ = "Asia/Kolkata";

/** Format a Date as YYYY-MM-DD in the given TZ. */
function ymdInTz(d: Date, tz: string): string {
  // Use Intl to get the date parts in the target TZ, then assemble manually
  // to avoid timezone-offset gotchas.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

function humanDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Given a YYYY-MM-DD, return the next calendar day's YYYY-MM-DD. */
function nextDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export async function loadTodayContext(tz: string = DEFAULT_TZ): Promise<TodayContext> {
  return logger.timed("discord.today.load", { tz }, async () => {
    const db = await getDb();
    const now = new Date();
    const today = ymdInTz(now, tz);
    const todayHuman = humanDate(now, tz);
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // The day window in the configured TZ — we use the YYYY-MM-DD strings
    // directly (NOT a UTC-to-IST slice) so MongoDB's lexicographic string
    // comparison on ISO dates works correctly.
    const tomorrowYmd = nextDayYmd(today);
    const [eventsToday, catalogueRecent, financeRecent] = await Promise.all([
      // Events whose `date` falls inside today, OR whose range straddles today.
      db
        .collection<MarketingEventDoc>("marketing_events")
        .find(
          {
            $or: [
              { date: { $gte: today, $lt: tomorrowYmd } },
              { endDate: { $gte: today }, date: { $lte: tomorrowYmd } },
            ],
          },
          { projection: { _id: 0 } }
        )
        .sort({ date: 1 })
        .toArray(),
      db
        .collection("catalogue_jobs")
        .countDocuments({ generatedAt: { $gte: last24hStart.toISOString() } }),
      db
        .collection<FinanceTransactionDoc>("finance_transactions")
        .find(
          { createdAt: { $gte: last24hStart.toISOString() } },
          { projection: { _id: 0, direction: 1, amount: 1 } }
        )
        .toArray(),
    ]);

    const eventsOngoing = eventsToday.filter((e) => {
      if (!e.endDate) return false;
      return new Date(e.endDate) >= now && new Date(e.date) <= now;
    });

    const byCategory: Record<string, number> = {};
    for (const cat of Object.keys(MARKETING_CATEGORY_LABELS)) byCategory[cat] = 0;
    for (const e of eventsToday) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    }

    let income = 0;
    let expense = 0;
    let count = 0;
    for (const tx of financeRecent) {
      count += 1;
      if (tx.direction === "in") income += tx.amount;
      else expense += tx.amount;
    }

    return {
      today,
      todayHuman,
      eventsToday,
      eventsOngoing,
      byCategory,
      catalogueJobsRecent: catalogueRecent,
      financeLast24hIncome: income,
      financeLast24hExpense: expense,
      financeLast24hNet: income - expense,
      financeLast24hCount: count,
      assembledAt: now.toISOString(),
      tz,
    };
  });
}
