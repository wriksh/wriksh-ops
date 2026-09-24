import { NextResponse } from "next/server";
import { runDiscordCategorization } from "@/lib/discord/categorize";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/discord-categorize
 *
 * Scheduled by Vercel Cron (`vercel.json` → 0 9 * * *, IST). Runs the
 * Discord-message categorization pipeline end-to-end and posts the
 * daily digest to the `today` channel.
 *
 * Auth: `Authorization: Bearer ${DISCORD_CRON_SECRET}` (Vercel pattern)
 *       OR same-origin request (admin UI "Run now" button).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const url = new URL(req.url);
  const dateYmd = url.searchParams.get("date") ?? undefined;
  const trigger = sameOrigin && !bearer ? "manual" : "cron";

  try {
    const summary = await runDiscordCategorization({ trigger, dateYmd });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error("cron.categorize.fail", { reason: String(err) });
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
