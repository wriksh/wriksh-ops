/**
 * scripts/cron_daily.ts
 *
 * Standalone CLI that runs the Discord daily-reminder digest end-to-end.
 *
 * Usage:
 *   npm run cron:daily                       # actually post to all eligible channels
 *   npm run cron:daily -- --dry-run          # print the payload that WOULD be posted
 *   npm run cron:daily -- --tz UTC           # override timezone
 *   npm run cron:daily -- --channel ops      # only post to one channel (by slug)
 *
 * Designed to be scheduled by:
 *   - crontab on your laptop: `0 8 * * *  cd /path && /Users/omkar/miniconda3/envs/macenv/bin/npm run cron:daily`
 *   - the built-in node-cron inside the bot process (see scripts/wrikshbot.ts)
 *   - any HTTP cron hitting GET /api/discord/cron/daily
 */

import { runDailyDigest } from "../lib/discord/dailyDigest";
import { logger } from "../lib/logger";

interface Args {
  dryRun: boolean;
  tz?: string;
  channel?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--tz") out.tz = argv[++i];
    else if (a === "--channel") out.channel = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: npm run cron:daily [-- --dry-run] [-- --tz <tz>] [-- --channel <slug>]"
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runDailyDigest({
    dryRun: args.dryRun,
    tz: args.tz,
    channelSlugs: args.channel ? [args.channel] : undefined,
    triggeredBy: "cli",
  });

  console.log("\n=== Daily digest run summary ===");
  console.log(`jobId              : ${result.jobId}`);
  console.log(`intro source       : ${result.introSource}`);
  console.log(`events today       : ${result.context.eventsToday.length}`);
  console.log(`channels attempted : ${result.channelsAttempted}`);
  console.log(`channels posted    : ${result.channelsPosted}`);
  console.log(`channels failed    : ${result.channelsFailed}`);
  console.log(`finance net (24h)  : ₹${result.context.financeLast24hNet.toLocaleString("en-IN")}`);

  if (args.dryRun && result.payloadPreview) {
    console.log("\n=== Payload preview (dry-run) ===");
    console.log(JSON.stringify(result.payloadPreview, null, 2).slice(0, 4000));
    console.log("\n(Dry-run: nothing was actually posted to Discord.)");
  }

  logger.info("cron_daily.done", {
    jobId: result.jobId,
    channelsAttempted: result.channelsAttempted,
    channelsPosted: result.channelsPosted,
    channelsFailed: result.channelsFailed,
    dryRun: args.dryRun,
  });

  if (result.channelsFailed > 0 && !args.dryRun) {
    process.exitCode = 1; // let cron surface the partial-failure
  }
}

main().catch((err) => {
  logger.error("cron_daily.fail", { reason: String(err) });
  console.error("FATAL:", err);
  process.exit(1);
});
