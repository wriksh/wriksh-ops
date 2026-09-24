import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { readAndVerifyInteraction } from "@/lib/discord/verify";
import {
  pong,
  reply,
  defer,
  editOriginal,
  followUp,
  type InteractionResponseBody,
  type ParsedInteraction,
} from "@/lib/discord/respond";
import {
  COMMAND_HANDLERS,
  isUserAllowed,
  unauthorisedResponse,
} from "@/lib/discord/commands/registry";
import { FLAG_EPHEMERAL } from "@/lib/discord/respond";
import { buildTodayReply } from "@/lib/discord/commands/today";
import { buildAskReply } from "@/lib/discord/commands/ask";
import { buildCatalogue } from "@/lib/discord/commands/catalogue";
import { buildArtistsReply } from "@/lib/discord/commands/artists";
import { buildTendersReply } from "@/lib/discord/commands/tenders";
import { buildCategorizeNowReply } from "@/lib/discord/commands/categorizeNow";
import { buildDigestReportReply } from "@/lib/discord/commands/digestReport";
import { recordInteractionLog } from "@/lib/collections/discordCategories";

/**
 * POST /api/discord/interactions
 *
 * Single incoming endpoint for wrikshbot in serverless mode. Discord
 * posts every slash-command invocation here, signed with Ed25519 using
 * the app's public key.
 *
 * Flow:
 *   1. Read raw body and verify the Ed25519 signature.
 *   2. Handle PING (type=1) with a PONG (type=1).
 *   3. Look up the handler for the invoked command.
 *   4. If the handler returns an immediate reply body → respond with type=4.
 *   5. If the handler returns `{ defer: true }` → respond with type=5,
 *      then call the corresponding `buildXxxReply()` and edit the original.
 *   6. Log every invocation to the `discord_interaction_log` collection.
 *
 * Configure this URL in Discord Developer Portal → your app → General
 * Information → Interactions Endpoint URL.
 */

export const runtime = "nodejs"; // needs node:crypto
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseInteraction(raw: unknown): ParsedInteraction | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const data = (obj.data ?? {}) as Record<string, unknown>;
  const member = obj.member as { user?: { id: string; username: string } } | undefined;
  const user = member?.user ?? (obj.user as { id: string; username: string } | undefined);

  return {
    id: String(obj.id ?? ""),
    applicationId: String(obj.application_id ?? ""),
    type: Number(obj.type ?? 0),
    commandName: typeof data.name === "string" ? data.name : undefined,
    options: Array.isArray(data.options)
      ? (data.options as ParsedInteraction["options"])
      : undefined,
    user: user ? { id: String(user.id), username: String(user.username) } : undefined,
    channelId: obj.channel_id ? String(obj.channel_id) : undefined,
    guildId: obj.guild_id ? String(obj.guild_id) : undefined,
    token: String(obj.token ?? ""),
    appPermissions:
      typeof obj.app_permissions === "string" ? obj.app_permissions : undefined,
  };
}

export async function POST(req: Request) {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;

  // 1. Verify signature
  const verification = await readAndVerifyInteraction(req, publicKeyHex);
  if (!verification.ok) {
    logger.warn("discord.interactions.bad_signature", { reason: verification.error.reason });
    return NextResponse.json({ error: verification.error.reason }, { status: 401 });
  }

  // 2. Discord's PING handshake
  const parsed = parseInteraction(verification.body);
  const rawType = (verification.body as { type?: number })?.type;
  if (rawType === 1) {
    return NextResponse.json(pong());
  }

  if (!parsed || parsed.type !== 2) {
    return NextResponse.json(
      { error: `unsupported interaction type ${rawType}` },
      { status: 400 }
    );
  }

  const commandName = parsed.commandName;
  if (!commandName) {
    return NextResponse.json({ error: "no command name" }, { status: 400 });
  }

  const handler = COMMAND_HANDLERS[commandName];
  if (!handler) {
    return NextResponse.json(
      { error: `unknown command ${commandName}` },
      { status: 404 }
    );
  }

  // Privileged-command permission gate
  const { COMMAND_DEFINITIONS } = await import("@/lib/discord/commands/registry");
  const def = COMMAND_DEFINITIONS.find((d) => d.name === commandName);
  if (def?.privileged && parsed.user && !isUserAllowed(parsed.user.id)) {
    await recordInteractionLog({
      interactionId: parsed.id,
      command: commandName,
      userId: parsed.user.id,
      username: parsed.user.username,
      guildId: parsed.guildId,
      channelId: parsed.channelId,
      ok: false,
      durationMs: 0,
      source: "denied",
    }).catch(() => undefined);
    return NextResponse.json(unauthorisedResponse());
  }

  const startedAt = Date.now();
  let responseBody: InteractionResponseBody | null = null;
  let deferred = false;
  let ephemeralDefer = false;

  try {
    const result = await handler(parsed);
    if (result === null) {
      responseBody = reply("✅ Done.");
    } else if ("defer" in result) {
      deferred = true;
      ephemeralDefer = !!result.ephemeral;
    } else {
      responseBody = result;
    }
  } catch (err) {
    logger.error("discord.interactions.handler_error", {
      command: commandName,
      reason: String(err),
    });
    responseBody = reply("❌ Something went wrong. Check the logs.", { ephemeral: true });
  }

  // Deferred path: ACK now, run heavy work in background, edit original.
  if (deferred) {
    void (async () => {
      try {
        const finalBody =
          commandName === "today"
            ? await buildTodayReply()
            : commandName === "ask"
              ? await buildAskReply(parsed)
              : commandName === "catalogue"
                ? await buildCatalogueAndRespond(parsed)
                : commandName === "artists"
                  ? await buildArtistsReply(parsed)
                  : commandName === "tenders"
                    ? await buildTendersReply()
                    : commandName === "categorize-now"
                      ? await buildCategorizeNowReply()
                      : commandName === "digest-report"
                        ? await buildDigestReportReply(parsed)
                        : reply("✅ Done.");

        await editOriginal(parsed.token, {
          content: finalBody.data?.content,
          embeds: finalBody.data?.embeds as unknown[] | undefined,
        });
      } catch (err) {
        logger.error("discord.interactions.deferred_edit_failed", {
          command: commandName,
          reason: String(err),
        });
        await editOriginal(parsed.token, {
          content: "❌ Something went wrong. Check the logs.",
        });
      } finally {
        await recordInteractionLog({
          interactionId: parsed.id,
          command: commandName,
          userId: parsed.user?.id,
          username: parsed.user?.username,
          guildId: parsed.guildId,
          channelId: parsed.channelId,
          ok: true,
          durationMs: Date.now() - startedAt,
          source: ephemeralDefer ? "ephemeral-deferred" : "deferred",
        }).catch(() => undefined);
      }
    })();

    return NextResponse.json(defer({ ephemeral: ephemeralDefer }));
  }

  // Immediate reply path
  await recordInteractionLog({
    interactionId: parsed.id,
    command: commandName,
    userId: parsed.user?.id,
    username: parsed.user?.username,
    guildId: parsed.guildId,
    channelId: parsed.channelId,
    ok: true,
    durationMs: Date.now() - startedAt,
    source: responseBody?.data?.flags === FLAG_EPHEMERAL ? "ephemeral" : "public",
  }).catch(() => undefined);

  return NextResponse.json(responseBody);
}

/**
 * /catalogue is the one handler that returns a binary PDF. We edit the
 * deferred "thinking…" message with a text confirmation, then send a
 * follow-up multipart message carrying the PDF as `attachment://filename.pdf`.
 */
async function buildCatalogueAndRespond(parsed: ParsedInteraction): Promise<InteractionResponseBody> {
  const result = await buildCatalogue(parsed);
  if (!result.ok) {
    return reply(`❌ Could not render catalogue: ${result.reason}`);
  }
  await followUpWithPdfAttachment(
    parsed.token,
    result.buffer,
    result.filename,
    result.stateName
  );
  return reply(
    `📘 **${result.stateName}** catalogue (${(result.buffer.byteLength / 1024).toFixed(0)} KB) — see attached.`
  );
}

async function followUpWithPdfAttachment(
  token: string,
  buffer: Buffer,
  filename: string,
  stateName: string
): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) return;
  const form = new FormData();
  form.append(
    "files[0]",
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    filename
  );
  form.append(
    "payload_json",
    JSON.stringify({
      content: `📘 **${stateName}** catalogue (${(buffer.byteLength / 1024).toFixed(0)} KB)`,
      allowed_mentions: { parse: [] },
    })
  );
  try {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      logger.warn("discord.interactions.catalogue.followup_failed", {
        status: res.status,
        body: (await res.text().catch(() => "")).slice(0, 240),
      });
    }
  } catch (err) {
    logger.warn("discord.interactions.catalogue.followup_error", {
      reason: (err as Error).message,
    });
  }
}

// `followUp` is re-exported so tree-shaking keeps it reachable in the build.
export { followUp };
