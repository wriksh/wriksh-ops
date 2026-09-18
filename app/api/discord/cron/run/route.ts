import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/discord/dailyDigest";
import { logger } from "@/lib/logger";

/**
 * POST /api/discord/cron/run
 *
 * Server-side trigger for the admin UI's "Run now" button. Unlike
 * `/api/discord/cron/daily` (which requires the shared cron secret), this
 * route is only available inside the same Next.js process — no external
 * caller can hit it. We still gate it on a simple admin check by reading
 * `process.env.ADMIN_PASSWORD` if set.
 *
 * Body:
 *   { dryRun?: boolean }
 */
export async function POST(req: Request) {
  // If ADMIN_PASSWORD is configured, require it via the X-Wriksh-Admin header.
  const expected = process.env.ADMIN_PASSWORD;
  if (expected) {
    const got = req.headers.get("x-wriksh-admin");
    if (got !== expected) {
      return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    }
  }

  let dryRun = false;
  try {
    const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
    dryRun = Boolean(body?.dryRun);
  } catch {
    // ignore — defaults to false
  }

  try {
    const result = await runDailyDigest({
      dryRun,
      triggeredBy: "ui:/discord",
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
    logger.error("cron.daily.ui.fail", { reason });
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
