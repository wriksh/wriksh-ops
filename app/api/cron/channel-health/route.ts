import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { listDiscordChannels } from "@/lib/collections/discord";
import { postToDiscord } from "@/lib/discord/webhook";

/**
 * GET /api/cron/channel-health
 *
 * Scheduled by Vercel Cron (`vercel.json` -> 0 \/6 * * *). Pings every
 * webhook in `discord_channels` with a harmless "." content. Records
 * `lastPostOk`, `lastPostDurationMs`, `lastPostNotes` on each row.
 *
 * Auth: same as `/api/cron/discord-categorize`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function extractSecretFromAuthHeader(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1].trim() : null;
}

function isTrustedSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const expected = process.env.DISCORD_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const bearer = extractSecretFromAuthHeader(req.headers.get("authorization"));
  const sameOrigin = isTrustedSameOrigin(req);
  if (!bearer && !sameOrigin) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  if (bearer && bearer !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  try {
    const channels = await listDiscordChannels();
    const checks: { slug: string; ok: boolean; durationMs: number; reason?: string }[] = [];
    for (const ch of channels) {
      // Send a harmless "." ping. Discord rejects fully-empty payloads, so
      // we send one printable character. Webhooks won't surface this to
      // users (it shows as ".").
      const res = await postToDiscord(ch.webhookUrl, { content: "." });
      checks.push({
        slug: ch.slug,
        ok: res.ok,
        durationMs: res.durationMs,
        reason: res.ok ? undefined : res.reason,
      });
      if (!res.ok) {
        logger.warn("cron.channel_health.fail", {
          slug: ch.slug,
          reason: res.reason,
          status: res.status,
        });
      }
    }
    return NextResponse.json({ ok: true, checked: checks.length, results: checks });
  } catch (err) {
    logger.error("cron.channel_health.fail", { reason: String(err) });
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
