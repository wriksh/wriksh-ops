import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  COMMAND_DEFINITIONS,
  toDiscordCommand,
} from "@/lib/discord/commands/registry";
import { registerGuildCommands } from "@/lib/discord/respond";

/**
 * POST /api/discord/register-commands
 *
 * Bulk-overwrites the guild-scoped slash commands for `DISCORD_GUILD_ID`.
 * Triggered from the admin UI's "Sync commands" button.
 *
 * Auth: same-origin only (mirrors the pattern in cron/daily). Vercel
 * preview deployments still work because both calls come from the same host.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTrustedSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isTrustedSameOrigin(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const payload = COMMAND_DEFINITIONS.map(toDiscordCommand);
  const result = await registerGuildCommands(payload);
  if (!result.ok) {
    logger.error("discord.register_commands.fail", {
      status: result.status,
      reason: result.reason,
    });
    return NextResponse.json(
      { ok: false, status: result.status, reason: result.reason },
      { status: 502 }
    );
  }
  logger.info("discord.register_commands.ok", {
    count: Array.isArray(result.commands) ? result.commands.length : 0,
  });
  return NextResponse.json({
    ok: true,
    count: Array.isArray(result.commands) ? result.commands.length : 0,
  });
}
