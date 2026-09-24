import "server-only";
import { logger } from "@/lib/logger";

/**
 * Discord outgoing-webhook helpers for the serverless bot.
 *
 * In serverless mode (no gateway), every slash-command invocation arrives
 * via POST to `/api/discord/interactions`. We have up to 3 seconds to ACK,
 * then up to 15 minutes to send follow-ups via the interaction's `token`.
 *
 * Response types (the `type` field in our POST body):
 *   1 = PONG                              (Discord's initial handshake)
 *   4 = CHANNEL_MESSAGE_WITH_SOURCE       (reply with a message)
 *   5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE (reply "thinking…" then edit)
 *
 * Flags (the `data.flags` field, bitmask):
 *   1<<6  = 64  EPHEMERAL (only the invoking user sees it)
 *
 * All paths use Discord REST API v10.
 */

const API = "https://discord.com/api/v10";
const APP_ID = process.env.DISCORD_APPLICATION_ID ?? "";

export type InteractionResponseType =
  | 1 // PONG
  | 4 // CHANNEL_MESSAGE_WITH_SOURCE
  | 5; // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

export type InteractionResponseBody = {
  type: InteractionResponseType;
  data?: {
    content?: string;
    embeds?: unknown[];
    flags?: number;
    /** Allowed mentions config — disables @everyone pings by default. */
    allowed_mentions?: { parse?: string[] };
  };
};

export const FLAG_EPHEMERAL = 1 << 6;

/**
 * ACK an interaction with a PONG. Discord sends this once per app
 * registration as a handshake test.
 */
export function pong(): InteractionResponseBody {
  return { type: 1 };
}

/** Public reply with a message. */
export function reply(content: string, opts: { ephemeral?: boolean; embeds?: unknown[] } = {}): InteractionResponseBody {
  return {
    type: 4,
    data: {
      content: content.slice(0, 2000),
      embeds: opts.embeds?.slice(0, 10),
      flags: opts.ephemeral ? FLAG_EPHEMERAL : undefined,
      allowed_mentions: { parse: [] },
    },
  };
}

/** Defer the reply so we have time to do work, then edit it later. */
export function defer(opts: { ephemeral?: boolean } = {}): InteractionResponseBody {
  return {
    type: 5,
    data: {
      flags: opts.ephemeral ? FLAG_EPHEMERAL : undefined,
    },
  };
}

/**
 * Edit the original (deferred) reply with the final content.
 *
 * Endpoint: PATCH /webhooks/{appId}/{token}/messages/@original
 * Window:   15 minutes after the interaction was created.
 */
export async function editOriginal(
  interactionToken: string,
  body: { content?: string; embeds?: unknown[] }
): Promise<{ ok: boolean; status: number; reason?: string }> {
  if (!APP_ID) {
    return { ok: false, status: 0, reason: "DISCORD_APPLICATION_ID not set" };
  }
  const url = `${API}/webhooks/${APP_ID}/${interactionToken}/messages/@original`;
  return postJson(url, body);
}

/** Send a brand-new follow-up message in the same channel. */
export async function followUp(
  interactionToken: string,
  body: { content?: string; embeds?: unknown[]; ephemeral?: boolean }
): Promise<{ ok: boolean; status: number; reason?: string }> {
  if (!APP_ID) {
    return { ok: false, status: 0, reason: "DISCORD_APPLICATION_ID not set" };
  }
  const flags = body.ephemeral ? FLAG_EPHEMERAL : undefined;
  const url = `${API}/webhooks/${APP_ID}/${interactionToken}`;
  return postJson(url, {
    content: body.content?.slice(0, 2000),
    embeds: body.embeds?.slice(0, 10),
    flags,
    allowed_mentions: { parse: [] },
  });
}

async function postJson(
  url: string,
  body: { content?: string; embeds?: unknown[]; flags?: number; allowed_mentions?: unknown }
): Promise<{ ok: boolean; status: number; reason?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("discord.respond.http_error", {
        status: res.status,
        body: text.slice(0, 240),
      });
      return { ok: false, status: res.status, reason: text.slice(0, 200) };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    logger.warn("discord.respond.network_error", { reason: (err as Error).message });
    return { ok: false, status: 0, reason: (err as Error).message };
  }
}

/**
 * Bulk-overwrite guild-scoped slash commands. Used by the admin UI's
 * "Sync commands" button. Requires `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`.
 *
 * Returns the array of registered commands on success.
 */
export async function registerGuildCommands(
  commands: unknown[]
): Promise<{ ok: boolean; status: number; commands?: unknown[]; reason?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) {
    return {
      ok: false,
      status: 0,
      reason: "DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set",
    };
  }
  const url = `${API}/applications/${APP_ID}/guilds/${guildId}/commands`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(commands),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, reason: text.slice(0, 240) };
    }
    const data = (await res.json()) as unknown[];
    return { ok: true, status: res.status, commands: data };
  } catch (err) {
    return { ok: false, status: 0, reason: (err as Error).message };
  }
}

/** Discriminated union for the parts of an interaction we care about. */
export type ParsedInteraction = {
  id: string;
  applicationId: string;
  type: number;
  commandName?: string;
  options?: { name: string; type: number; value?: string | number | boolean }[];
  user?: { id: string; username: string; tag?: string };
  channelId?: string;
  guildId?: string;
  token: string;
  appPermissions?: string;
};
