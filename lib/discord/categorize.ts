import "server-only";
import { logger } from "@/lib/logger";
import { listDiscordChannels } from "@/lib/collections/discord";
import { fetchAllChannelMessages } from "@/lib/discord/messages";
import { categorizeDiscordMessage } from "@/lib/jev/categorize";
import { summariseDiscordDigest, buildReportPayload } from "@/lib/discord/report";
import {
  upsertReport,
  recordCategoryRows,
  recordCategorizationCron,
  type CategorizationCronLog,
} from "@/lib/collections/discordCategories";
import { postToDiscord } from "@/lib/discord/webhook";
import type {
  DiscordChannelDoc,
  DiscordMessageCategory,
  DiscordMessageCategoryDoc,
  DiscordMessageReportDoc,
} from "@/lib/types";
import { DISCORD_MESSAGE_CATEGORIES } from "@/lib/types";

/**
 * Orchestrator for the daily Discord-message categorization pipeline.
 *
 * Flow:
 *   1. Fetch last 24h of messages from every `discord_channels` row.
 *   2. For each message, ask Jev to categorize it.
 *   3. Persist each tagged row to `discord_message_categories`.
 *   4. Aggregate counts + top authors/channels.
 *   5. Call MiniMax to write a 4-6 sentence Wriksh-voiced summary.
 *   6. Upsert the daily report to `discord_message_reports`.
 *   7. Post the report to the channel whose ID matches
 *      `DISCORD_REPORT_CHANNEL_ID` (defaults to the user's "today" channel).
 *   8. Audit-log to `cron_jobs`.
 *
 * Idempotent: re-running on the same day overwrites the report.
 */

const TZ = process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata";
export const REPORT_CHANNEL_ID =
  process.env.DISCORD_REPORT_CHANNEL_ID ?? "1550500495452545094";
export const REPORT_CHANNEL_NAME =
  process.env.DISCORD_REPORT_CHANNEL_NAME ?? "today";
const MAX_CATEGORIZATIONS = Number(process.env.DISCORD_CATEGORIZE_MAX ?? 2000);

function todayYmdInTz(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function windowFor(dateYmd: string): { start: Date; end: Date } {
  // Compute midnight in the configured TZ as a UTC instant.
  // Trick: take the local clock time, ask the formatter to interpret it
  // in TZ, then compute the offset between that local string and UTC.
  const sampleUtc = new Date(`${dateYmd}T00:00:00Z`);
  const localInTz = new Date(
    sampleUtc.toLocaleString("en-US", { timeZone: TZ })
  );
  const offsetMs = sampleUtc.getTime() - localInTz.getTime();
  const start = new Date(sampleUtc.getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export type RunSummary = {
  windowStart: string;
  windowEnd: string;
  totalMessages: number;
  channelsProcessed: number;
  llmSource: "minimax" | "fallback";
  jevCalls: number;
  jevCostUsd: number;
  topCategories: { category: DiscordMessageCategory; count: number }[];
  postedToChannelId?: string;
  jevModel?: string;
};

export async function runDiscordCategorization(opts: {
  trigger?: "cron" | "command" | "manual";
  dateYmd?: string;
} = {}): Promise<RunSummary> {
  const trigger: CategorizationCronLog["kind"] =
    opts.trigger === "command" ? "manual" : "cron";
  const dateYmd = opts.dateYmd ?? todayYmdInTz();
  const { start, end } = windowFor(dateYmd);
  const startedAt = Date.now();

  logger.info("discord.categorize.start", {
    date: dateYmd,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    trigger: opts.trigger ?? "cron",
  });

  const channels = await listDiscordChannels();
  if (channels.length === 0) {
    logger.warn("discord.categorize.no_channels", {
      hint: "Add a channel in /discord first.",
    });
    return {
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      totalMessages: 0,
      channelsProcessed: 0,
      llmSource: "fallback",
      jevCalls: 0,
      jevCostUsd: 0,
      topCategories: [],
    };
  }

  const { flat, perChannel } = await fetchAllChannelMessages(channels, start);
  logger.info("discord.categorize.fetched", {
    channels: perChannel.length,
    okChannels: perChannel.filter((c) => c.ok).length,
    messages: flat.length,
  });

  const messagesToTag = flat.slice(0, MAX_CATEGORIZATIONS);
  const skippedCount = flat.length - messagesToTag.length;

  const jevCalls: DiscordMessageCategoryDoc[] = [];
  let jevCostUsd = 0;
  let jevModel: string | undefined;

  const queue = [...messagesToTag];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length > 0) {
        const m = queue.shift();
        if (!m) break;
        const tag = await categorizeDiscordMessage({
          content: m.content,
          channelSlug: m.channelSlug,
          authorName: m.authorName,
        });
        if (tag.jevModel) jevModel = tag.jevModel;
        jevCalls.push({
          messageId: m.id,
          channelSlug: m.channelSlug,
          channelId: m.channelId,
          authorId: m.authorId,
          authorName: m.authorName,
          messageTs: m.timestamp,
          content: m.content.slice(0, 500),
          category: tag.category,
          confidence: tag.confidence,
          jevModel: tag.jevModel,
          needsReview: tag.needsReview,
          classifiedAt: new Date().toISOString(),
        });
      }
    })
  );

  if (jevCalls.length > 0) {
    await recordCategoryRows(jevCalls);
  }

  const byCategory: Partial<Record<DiscordMessageCategory, number>> = {};
  const authorCount: Partial<
    Record<
      DiscordMessageCategory,
      Map<string, { authorId: string; authorName: string; count: number }>
    >
  > = {};
  const channelCount: Partial<
    Record<
      DiscordMessageCategory,
      Map<string, { channelSlug: string; count: number }>
    >
  > = {};

  for (const row of jevCalls) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    const a = authorCount[row.category] ?? new Map();
    const prev = a.get(row.authorId);
    if (prev) prev.count += 1;
    else
      a.set(row.authorId, {
        authorId: row.authorId,
        authorName: row.authorName,
        count: 1,
      });
    authorCount[row.category] = a;

    const c = channelCount[row.category] ?? new Map();
    const cp = c.get(row.channelSlug);
    if (cp) cp.count += 1;
    else c.set(row.channelSlug, { channelSlug: row.channelSlug, count: 1 });
    channelCount[row.category] = c;
  }

  const topAuthors: DiscordMessageReportDoc["topAuthors"] = {};
  for (const k of DISCORD_MESSAGE_CATEGORIES) {
    const m = authorCount[k];
    if (!m) continue;
    topAuthors[k] = Array.from(m.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }
  const topChannels: DiscordMessageReportDoc["topChannels"] = {};
  for (const k of DISCORD_MESSAGE_CATEGORIES) {
    const m = channelCount[k];
    if (!m) continue;
    topChannels[k] = Array.from(m.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const sortedCats = (Object.entries(byCategory) as [DiscordMessageCategory, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const summaryResult = await summariseDiscordDigest({
    date: dateYmd,
    totalMessages: jevCalls.length,
    channelsProcessed: perChannel.filter((c) => c.ok).length,
    byCategory: sortedCats,
    jevModel,
  });

  const report: Omit<DiscordMessageReportDoc, "_id"> = {
    date: dateYmd,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    totalMessages: jevCalls.length,
    channelsProcessed: perChannel.filter((c) => c.ok).length,
    byCategory,
    topAuthors,
    topChannels,
    summary: summaryResult.text,
    llmSource: summaryResult.source,
    jevModel,
    jevCalls: jevCalls.length,
    jevCostUsd,
    generatedAt: new Date().toISOString(),
    generatedBy: opts.trigger ?? "cron",
  };

  await upsertReport({ ...report, postedToChannelId: REPORT_CHANNEL_ID });

  const payload = buildReportPayload(report);
  const postResult = await postToDiscord(
    buildWebhookForChannel(channels, REPORT_CHANNEL_ID),
    payload
  );
  if (!postResult.ok) {
    logger.warn("discord.categorize.post_failed", { reason: postResult.reason });
  }

  const durationMs = Date.now() - startedAt;
  await recordCategorizationCron({
    jobId: `cat-${dateYmd}-${startedAt.toString(36)}`,
    kind: trigger,
    status: perChannel.every((c) => c.ok) ? "success" : "partial",
    channelsAttempted: perChannel.length,
    channelsPosted: postResult.ok ? 1 : 0,
    channelsFailed: postResult.ok ? 0 : 1,
    eventCount: jevCalls.length,
    llmSource: summaryResult.source,
    jevModel,
    jevCostUsd,
    durationMs,
    triggeredBy: `categorize:${opts.trigger ?? "cron"}`,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
  });

  logger.info("discord.categorize.done", {
    date: dateYmd,
    durationMs,
    messages: jevCalls.length,
    skipped: skippedCount,
    llmSource: summaryResult.source,
    jevCostUsd,
  });

  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    totalMessages: jevCalls.length,
    channelsProcessed: perChannel.filter((c) => c.ok).length,
    llmSource: summaryResult.source,
    jevCalls: jevCalls.length,
    jevCostUsd,
    topCategories: sortedCats
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
    postedToChannelId: postResult.ok ? REPORT_CHANNEL_ID : undefined,
    jevModel,
  };
}

function buildWebhookForChannel(
  channels: DiscordChannelDoc[],
  channelId: string
): string {
  const match = channels.find((c) => c.channelId === channelId);
  if (match) return match.webhookUrl;
  // The "today" channel may not have a row in `discord_channels` — fall
  // back to a synthetic invalid URL so the post fails loudly.
  return `https://discord.com/api/webhooks/${channelId}/missing`;
}

export type { DiscordChannelDoc };
