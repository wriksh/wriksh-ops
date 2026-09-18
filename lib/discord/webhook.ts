import "server-only";
import { logger } from "@/lib/logger";

/**
 * Discord webhook poster.
 *
 * A Discord webhook is just an HTTPS POST — no bot account needed. Each
 * discord_channels row stores its webhook URL and we use it to deliver
 * the daily digest + any ad-hoc notifications.
 *
 * Retries once on 5xx / network failure. Returns a small structured
 * result the caller can write to the cron_jobs audit log.
 */

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  /** ISO8601 timestamp; Discord renders it as a relative "5 minutes ago". */
  timestamp?: string;
  color?: number; // decimal RGB
  author?: { name: string; icon_url?: string; url?: string };
  footer?: { text: string; icon_url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
};

export type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
};

export type PostResult =
  | { ok: true; status: number; durationMs: number; webhookHost: string }
  | { ok: false; status?: number; durationMs: number; reason: string; webhookHost: string };

/** Extract hostname for logs without leaking the webhook secret. */
function hostOf(webhookUrl: string): string {
  try {
    return new URL(webhookUrl).host;
  } catch {
    return "invalid-url";
  }
}

async function postOnce(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ status: number; text: string }> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

/**
 * POST a payload to a Discord webhook.
 *
 * Behaviour:
 *   - 2xx → ok:true
 *   - 429 (rate limit) → respects Retry-After if present, then one retry
 *   - 5xx or network error → one retry after 5s
 *   - 4xx other → fail immediately (bad payload / bad URL — retrying won't help)
 */
export async function postToDiscord(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<PostResult> {
  const webhookHost = hostOf(webhookUrl);
  if (webhookHost === "invalid-url") {
    return { ok: false, durationMs: 0, reason: "invalid webhook url", webhookHost };
  }
  const start = Date.now();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { status, text } = await postOnce(webhookUrl, payload);

      // Rate limited — respect Retry-After.
      if (status === 429) {
        const retryAfterSec = Number(
          text.match(/"retry_after":\s*([\d.]+)/)?.[1] ?? "5"
        );
        const waitMs = Math.min(15_000, Math.max(1000, retryAfterSec * 1000));
        logger.warn("discord.webhook.rate_limited", {
          webhookHost,
          attempt,
          retryAfterMs: waitMs,
        });
        if (attempt < maxAttempts) {
          await sleep(waitMs);
          continue;
        }
        return { ok: false, status, durationMs: Date.now() - start, reason: "rate_limited", webhookHost };
      }

      if (status >= 200 && status < 300) {
        return { ok: true, status, durationMs: Date.now() - start, webhookHost };
      }

      if (status >= 500 && attempt < maxAttempts) {
        logger.warn("discord.webhook.server_error.retry", {
          webhookHost,
          status,
          attempt,
        });
        await sleep(5000);
        continue;
      }

      // 4xx other — give up.
      return {
        ok: false,
        status,
        durationMs: Date.now() - start,
        reason: `http_${status}: ${text.slice(0, 200)}`,
        webhookHost,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn("discord.webhook.network_error", {
        webhookHost,
        attempt,
        reason,
      });
      if (attempt < maxAttempts) {
        await sleep(5000);
        continue;
      }
      return { ok: false, durationMs: Date.now() - start, reason, webhookHost };
    }
  }

  return { ok: false, durationMs: Date.now() - start, reason: "exhausted_retries", webhookHost };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Split a large list of embeds into chunks that fit Discord's
 * per-message limit (10 embeds / 6000 chars total).
 */
export function chunkEmbeds(embeds: DiscordEmbed[], maxPerMessage = 10): DiscordEmbed[][] {
  if (embeds.length === 0) return [];
  const out: DiscordEmbed[][] = [];
  for (let i = 0; i < embeds.length; i += maxPerMessage) {
    out.push(embeds.slice(i, i + maxPerMessage));
  }
  return out;
}
