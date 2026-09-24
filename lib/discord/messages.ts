import "server-only";
import { logger } from "@/lib/logger";
import type { DiscordChannelDoc } from "@/lib/types";

/**
 * Discord message fetcher.
 *
 * Pulls messages from each `discord_channels` row for a given time window.
 * Uses Discord REST API v10 with the bot token. Honours the documented
 * `X-RateLimit-Remaining` and `Retry-After` headers.
 *
 * Concurrency: 2 channels at a time (well under the 5 req/5s/channel
 * limit). Per-channel cap: 500 messages (safety bound).
 */

const API = "https://discord.com/api/v10";
const USER_AGENT = "wriksh-ops (https://wriksh.com, v1)";

export type RawDiscordMessage = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  /** ISO timestamp. */
  timestamp: string;
  content: string;
  /** Attachment URLs only — we don't fetch the files. */
  attachments: string[];
};

const MAX_MESSAGES_PER_CHANNEL = 500;
const MAX_CONCURRENCY = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseIso(s: string): Date {
  return new Date(s);
}

/**
 * Snowflake-from-date: returns a Discord snowflake string for the given
 * Date, used as the `after` cursor to fetch recent messages.
 */
function snowflakeFromDate(d: Date): string {
  const DISCORD_EPOCH = 1420070400000;
  const ms = d.getTime() - DISCORD_EPOCH;
  return (BigInt(ms) << 22n).toString();
}

async function fetchChannelPage(
  channelId: string,
  afterSnowflake: string,
  token: string,
  limit = 100
): Promise<{ messages: RawDiscordMessage[]; rateLimited: boolean }> {
  const url = `${API}/channels/${channelId}/messages?limit=${limit}&after=${afterSnowflake}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as {
      retry_after?: number;
      message?: string;
    };
    const retryAfterSec = Number(body.retry_after ?? 1);
    logger.warn("discord.messages.rate_limited", {
      channelId,
      retryAfterSec,
      message: body.message,
    });
    await sleep(retryAfterSec * 1000);
    return { messages: [], rateLimited: true };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn("discord.messages.http_error", {
      channelId,
      status: res.status,
      body: text.slice(0, 200),
    });
    return { messages: [], rateLimited: false };
  }

  const data = (await res.json()) as Array<{
    id: string;
    timestamp: string;
    content: string;
    author: { id: string; username: string; global_name?: string };
    attachments?: Array<{ url: string }>;
  }>;

  const messages: RawDiscordMessage[] = data.map((m) => ({
    id: m.id,
    channelId,
    authorId: m.author?.id ?? "unknown",
    authorName: m.author?.global_name || m.author?.username || "unknown",
    timestamp: m.timestamp,
    content: m.content ?? "",
    attachments: (m.attachments ?? []).map((a) => a.url),
  }));
  return { messages, rateLimited: false };
}

async function fetchChannelMessages(
  channelId: string,
  since: Date,
  token: string
): Promise<RawDiscordMessage[]> {
  const collected: RawDiscordMessage[] = [];
  let cursor = snowflakeFromDate(since);
  let retries = 0;

  while (collected.length < MAX_MESSAGES_PER_CHANNEL) {
    const { messages, rateLimited } = await fetchChannelPage(
      channelId,
      cursor,
      token,
      Math.min(100, MAX_MESSAGES_PER_CHANNEL - collected.length)
    );
    if (rateLimited && retries < 3) {
      retries += 1;
      continue;
    }
    if (messages.length === 0) break;

    const sorted = messages.sort(
      (a, b) => parseIso(a.timestamp).getTime() - parseIso(b.timestamp).getTime()
    );
    collected.push(...sorted);
    cursor = sorted[sorted.length - 1].id;

    const oldest = parseIso(sorted[0].timestamp);
    if (oldest.getTime() < since.getTime()) {
      while (
        collected.length > 0 &&
        parseIso(collected[0].timestamp).getTime() < since.getTime()
      ) {
        collected.shift();
      }
      break;
    }

    if (messages.length < 100) break;
  }

  return collected.slice(0, MAX_MESSAGES_PER_CHANNEL);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }
  );
  await Promise.all(workers);
  return out;
}

export type ChannelFetchResult = {
  channelSlug: string;
  channelId: string;
  ok: boolean;
  messageCount: number;
  errorReason?: string;
};

export async function fetchAllChannelMessages(
  channels: DiscordChannelDoc[],
  since: Date
): Promise<{
  flat: (RawDiscordMessage & { channelSlug: string })[];
  perChannel: ChannelFetchResult[];
}> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn("discord.messages.no_token", {
      hint: "DISCORD_BOT_TOKEN is not set. Skipping message fetch.",
    });
    return { flat: [], perChannel: [] };
  }

  type FetchOk = {
    channelSlug: string;
    channelId: string;
    ok: true;
    messageCount: number;
    messages: RawDiscordMessage[];
  };
  type FetchErr = {
    channelSlug: string;
    channelId: string;
    ok: false;
    messageCount: number;
    errorReason: string;
  };

  const results = await mapWithConcurrency(channels, MAX_CONCURRENCY, async (channel) => {
    try {
      const msgs = await fetchChannelMessages(channel.channelId, since, token);
      return {
        channelSlug: channel.slug,
        channelId: channel.channelId,
        ok: true as const,
        messageCount: msgs.length,
        messages: msgs,
      } satisfies FetchOk;
    } catch (err) {
      return {
        channelSlug: channel.slug,
        channelId: channel.channelId,
        ok: false as const,
        messageCount: 0,
        errorReason: (err as Error).message,
      } satisfies FetchErr;
    }
  });

  const flat: (RawDiscordMessage & { channelSlug: string })[] = [];
  const perChannel: ChannelFetchResult[] = [];
  for (const r of results) {
    perChannel.push({
      channelSlug: r.channelSlug,
      channelId: r.channelId,
      ok: r.ok,
      messageCount: r.messageCount,
      errorReason: r.ok ? undefined : r.errorReason,
    });
    if (r.ok) {
      for (const m of r.messages) {
        flat.push({ ...m, channelSlug: r.channelSlug });
      }
    }
  }
  return { flat, perChannel };
}
