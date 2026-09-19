import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/discord/dailyDigest";
import { logger } from "@/lib/logger";

/**
 * POST /api/discord/cron/run
 *
 * Server-side trigger for the admin UI's "Run now" button. Unlike
 * `/api/discord/cron/daily` (which requires the shared cron secret and
 * is meant for external schedulers), this route is internal to the
 * Next.js process — only the admin UI talks to it, and only same-origin
 * requests can reach it. There is no separate auth gate here because
 * the only caller is the in-app UI; when we add real admin auth
 * (Firebase / NextAuth), it goes through middleware.
 *
 * Body:
 *   { dryRun?: boolean }
 */
export async function POST(req: Request) {
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
