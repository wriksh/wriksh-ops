import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/discord/dailyDigest";
import { logger } from "@/lib/logger";

/**
 * GET /api/discord/cron/daily
 *
 * Scheduled by Vercel Cron (`vercel.json` → 0 8 * * *) and any external
 * scheduler that wants to trigger the daily digest.
 *
 * Authentication (any one of):
 *   - `Authorization: Bearer ${DISCORD_CRON_SECRET}`   ← Vercel Cron pattern
 *   - `X-Wriksh-Cron-Secret: ${DISCORD_CRON_SECRET}`    ← legacy, kept for
 *                                                          backwards compat
 *   - Same-origin request from the admin UI "Run now" button (no header
 *     expected — see the `trustedOrigin` check below)
 *
 * Query params:
 *   - dryRun=1   → don't actually post, but still record the run
 *   - tz=<tz>    → override timezone
 *   - secret=<s> → URL-encoded secret (last-resort, logged at warn)
 *
 * Status codes:
 *   200 — completed (check body for per-channel results)
 *   401 — missing/wrong secret
 *   500 — unexpected failure
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractSecretFromAuthHeader(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1].trim() : null;
}

function isTrustedSameOrigin(req: Request): boolean {
  // Admin UI "Run now" posts from the browser; allow if the Origin header
  // matches the Host header of the same request. Vercel preview deployments
  // will still work because both come from the same host.
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

export async function GET(req: Request) {
  const expected = process.env.DISCORD_CRON_SECRET;
  if (!expected) {
    logger.warn("cron.daily.no_secret_configured", {
      hint: "Set DISCORD_CRON_SECRET (or CRON_SECRET) in the environment.",
    });
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);

  // Three accepted auth paths, in priority order:
  const bearer = extractSecretFromAuthHeader(req.headers.get("authorization"));
  const legacy = req.headers.get("x-wriksh-cron-secret");
  const querySecret = url.searchParams.get("secret");
  const sameOrigin = isTrustedSameOrigin(req);

  const presented =
    bearer ?? legacy ?? (querySecret && !sameOrigin ? querySecret : null);

  const authOk =
    (presented !== null && presented === expected) || sameOrigin;

  if (!authOk) {
    logger.warn("cron.daily.unauthorised", {
      hasBearer: !!bearer,
      hasLegacy: !!legacy,
      hasQuerySecret: !!querySecret,
      sameOrigin,
    });
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  if (querySecret && !bearer && !legacy) {
    logger.warn("cron.daily.query_secret_used", {
      hint: "Prefer Authorization header. Query-string secrets show up in logs.",
    });
  }

  const dryRun = url.searchParams.get("dryRun") === "1";
  const tz = url.searchParams.get("tz") ?? undefined;

  try {
    const result = await runDailyDigest({
      dryRun,
      tz,
      triggeredBy: "http:/api/discord/cron/daily",
    });
    return NextResponse.json({
      ok: result.ok,
      jobId: result.jobId,
      introSource: result.introSource,
      channelsAttempted: result.channelsAttempted,
      channelsPosted: result.channelsPosted,
      channelsFailed: result.channelsFailed,
      eventCount: result.context.eventsToday.length,
      financeLast24hNet: result.context.financeLast24hNet,
      dryRun,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("cron.daily.http.fail", { reason });
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
