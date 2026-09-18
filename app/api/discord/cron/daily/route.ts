import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/discord/dailyDigest";
import { logger } from "@/lib/logger";

/**
 * GET /api/discord/cron/daily
 *
 * Triggered by Vercel Cron / GitHub Actions / any external scheduler.
 * Authentication: requires the `X-Wriksh-Cron-Secret` header to match
 * `DISCORD_CRON_SECRET` from the env. Vercel Cron sends a custom header
 * you can set in the cron config.
 *
 * Query params:
 *   - dryRun=1   → don't actually post, but still record the run
 *   - tz=<tz>    → override timezone
 *
 * Status codes:
 *   200 — completed (check body for per-channel results)
 *   401 — missing/wrong X-Wriksh-Cron-Secret
 *   500 — unexpected failure
 */
export async function GET(req: Request) {
  const expected = process.env.DISCORD_CRON_SECRET;
  const got = req.headers.get("x-wriksh-cron-secret");
  if (!expected || !got || got !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const url = new URL(req.url);
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
