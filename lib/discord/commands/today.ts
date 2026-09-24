import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import { runDailyDigest } from "@/lib/discord/dailyDigest";

/**
 * /today — same digest the cron posts, but inline in the channel.
 *
 * Reuses the existing `runDailyDigest({ dryRun: true })` orchestrator and
 * converts its `DiscordWebhookPayload` into Discord's interaction-response
 * embeds. We never call `EmbedBuilder` from discord.js here — the server
 * stays zero-dep on the gateway at runtime.
 */

export async function handleToday(
  _interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  // The digest can take a few seconds (Mongo + MiniMax roundtrip), so defer.
  return { defer: true };
}

/**
 * Helper used by the deferred edit step (called from the interaction route
 * after we ACK with type=5). Returns an InteractionResponseBody whose
 * `data` we then forward to `editOriginal`.
 */
export async function buildTodayReply(): Promise<InteractionResponseBody> {
  const tz = process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata";
  const result = await runDailyDigest({ dryRun: true, tz, triggeredBy: "bot:/today" });
  const payload = result.payloadPreview;
  if (!payload) {
    return {
      type: 4,
      data: { content: "No digest preview available.", allowed_mentions: { parse: [] } },
    };
  }
  return {
    type: 4,
    data: {
      content: (payload.content ?? "").slice(0, 2000),
      embeds: (payload.embeds ?? []).map((e) => ({
        title: (e.title ?? "").slice(0, 256),
        description: (e.description ?? "").slice(0, 1024),
        color: e.color,
        fields: (e.fields ?? []).slice(0, 25).map((f) => ({
          name: f.name.slice(0, 256),
          value: f.value.slice(0, 1024),
          inline: f.inline,
        })),
        footer: e.footer ? { text: e.footer.text.slice(0, 2048) } : undefined,
        timestamp: e.timestamp,
      })),
      allowed_mentions: { parse: [] },
    },
  };
}
