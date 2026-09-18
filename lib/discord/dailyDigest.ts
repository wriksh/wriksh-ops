import "server-only";
import { logger } from "@/lib/logger";
import { loadTodayContext, type TodayContext } from "@/lib/discord/today";
import { buildDailyDigestMessage } from "@/lib/discord/format";
import {
  postToDiscord,
  chunkEmbeds,
  type DiscordWebhookPayload,
} from "@/lib/discord/webhook";
import { dailyDigestPrompt } from "@/lib/minimax";
import { listDiscordChannels, recordChannelPost } from "@/lib/collections/discord";
import { recordCronRun } from "@/lib/collections/cron";
import type { DiscordChannelDoc } from "@/lib/types";

/**
 * Orchestrator for the daily reminder.
 *
 * Used by:
 *   - `scripts/cron_daily.ts` (cron / CLI)
 *   - `app/api/discord/cron/daily/route.ts` (HTTP)
 *   - the manual "Run now" button on the admin UI
 *
 * Pipeline:
 *   1. Load TodayContext from MongoDB
 *   2. Generate an intro via MiniMax (with fallback)
 *   3. Build the message payload via the formatter
 *   4. For every discord_channels row whose notifyCategories overlap
 *      today's categories → POST to that channel's webhook
 *   5. Audit-log the whole run
 */

export type DailyDigestRunOptions = {
  /** Override timezone (default: process.env.DISCORD_CRON_TZ || Asia/Kolkata) */
  tz?: string;
  /** True for the --dry-run CLI flag — does not POST. */
  dryRun?: boolean;
  /** Tag for the audit log. Defaults to "manual" for ad-hoc runs. */
  triggeredBy?: string;
  /** Optional explicit channel-slug list. Defaults to all published channels. */
  channelSlugs?: string[];
};

export type DailyDigestRunResult = {
  ok: boolean;
  jobId: string;
  context: TodayContext;
  introSource: "minimax" | "fallback";
  channelsAttempted: number;
  channelsPosted: number;
  channelsFailed: number;
  payloadPreview?: DiscordWebhookPayload;
};

function nowIso() {
  return new Date().toISOString();
}

function randId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function channelWantsAny(
  channel: DiscordChannelDoc,
  todayCategories: string[]
): boolean {
  if (channel.status && channel.status !== "published") return false;
  if (channel.notifyCategories.length === 0) return true; // opt-out model
  return channel.notifyCategories.some((c) => todayCategories.includes(c));
}

export async function runDailyDigest(
  opts: DailyDigestRunOptions = {}
): Promise<DailyDigestRunResult> {
  const startedAt = Date.now();
  const jobId = randId();
  const tz = opts.tz ?? process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata";

  return logger.timed(
    "discord.dailyDigest.run",
    { jobId, tz, dryRun: !!opts.dryRun },
    async () => {
      const context = await loadTodayContext(tz);
      const todayCategories = Object.entries(context.byCategory)
        .filter(([, n]) => n > 0)
        .map(([c]) => c);

      const introResult = await dailyDigestPrompt({
        today: context.todayHuman,
        eventsToday: context.eventsToday.length,
        byCategory: context.byCategory,
        topEventTitles: context.eventsToday.slice(0, 3).map((e) => e.title),
        cataloguesRenderedLast24h: context.catalogueJobsRecent,
        financeTodayNet: context.financeLast24hNet,
      });

      const payload = buildDailyDigestMessage(context, introResult.text);
      const payloadPreview = opts.dryRun ? payload : undefined;

      const allChannels = await listDiscordChannels();
      const targetChannels = opts.channelSlugs
        ? allChannels.filter((c) => opts.channelSlugs!.includes(c.slug))
        : allChannels;
      const eligible = targetChannels.filter((c) =>
        channelWantsAny(c, todayCategories)
      );

      if (opts.dryRun) {
        // Still record the run so the admin UI shows the dry-run.
        await recordCronRun({
          jobId,
          kind: opts.triggeredBy === "cli" ? "daily-reminder" : "manual",
          status: "success",
          channelsAttempted: eligible.length,
          channelsPosted: 0,
          channelsFailed: 0,
          eventCount: context.eventsToday.length,
          llmSource: introResult.source,
          durationMs: Date.now() - startedAt,
          triggeredBy: `${opts.triggeredBy ?? "unknown"}:dry-run`,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: nowIso(),
        });
        return {
          ok: true,
          jobId,
          context,
          introSource: introResult.source,
          channelsAttempted: eligible.length,
          channelsPosted: 0,
          channelsFailed: 0,
          payloadPreview: payload,
        };
      }

      let posted = 0;
      let failed = 0;

      for (const channel of eligible) {
        // Chunk into <=10 embeds per message; daily digest is already 1 +
        // N events + finance, so we may need multiple messages for busy
        // days.
        const chunks = chunkEmbeds(payload.embeds ?? [], 10);
        let channelOk = true;
        let lastDuration = 0;
        let lastReason = "";
        for (const chunk of chunks) {
          const messagePayload: DiscordWebhookPayload = {
            username: payload.username,
            avatar_url: payload.avatar_url,
            // Only put the LLM intro on the first message in the chain —
            // the rest are just embeds.
            content: chunks.indexOf(chunk) === 0 ? payload.content : undefined,
            embeds: chunk,
          };
          const result = await postToDiscord(channel.webhookUrl, messagePayload);
          lastDuration = result.durationMs;
          if (!result.ok) {
            channelOk = false;
            lastReason = result.reason;
            logger.warn("discord.dailyDigest.channel_failed", {
              channel: channel.slug,
              reason: result.reason,
              status: "status" in result ? result.status : undefined,
            });
            break; // don't spam retries across chunks for the same channel
          }
        }

        await recordChannelPost(
          channel.slug,
          channelOk,
          lastDuration,
          channelOk ? undefined : lastReason
        );

        if (channelOk) posted += 1;
        else failed += 1;
      }

      const status: "success" | "partial" | "failed" =
        failed === 0 ? "success" : posted === 0 ? "failed" : "partial";

      await recordCronRun({
        jobId,
        kind: opts.triggeredBy === "cli" ? "daily-reminder" : "manual",
        status,
        channelsAttempted: eligible.length,
        channelsPosted: posted,
        channelsFailed: failed,
        eventCount: context.eventsToday.length,
        llmSource: introResult.source,
        durationMs: Date.now() - startedAt,
        triggeredBy: opts.triggeredBy ?? "unknown",
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: nowIso(),
      });

      return {
        ok: status !== "failed",
        jobId,
        context,
        introSource: introResult.source,
        channelsAttempted: eligible.length,
        channelsPosted: posted,
        channelsFailed: failed,
      };
    }
  );
}
