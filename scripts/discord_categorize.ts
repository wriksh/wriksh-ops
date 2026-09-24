/**
 * scripts/discord_categorize.ts
 *
 * CLI mirror of the 09:00 IST Vercel cron. Useful for local testing and
 * ad-hoc re-runs.
 *
 *   npm run cron:categorize                       # live
 *   npm run cron:categorize -- --dry-run          # build report, don't post
 *   npm run cron:categorize -- --date 2026-09-23  # backfill a specific date
 */

import { runDiscordCategorization } from "../lib/discord/categorize";
import { logger } from "../lib/logger";

interface Args {
  dryRun: boolean;
  date?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--date") out.date = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: npm run cron:categorize [-- --dry-run] [-- --date YYYY-MM-DD]"
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
  if (args.dryRun) {
    // TODO: short-circuit post step. The current orchestrator posts
    // unconditionally; for now, dry-run is a soft warning so we don't
    // accidentally post during local dev.
    console.warn(
      "--dry-run is honoured at the network layer (the cron route will\n" +
        "  not actually post if you call the API directly with the secret).\n" +
        "  When invoking this CLI script, set DISCORD_REPORT_CHANNEL_ID to a\n" +
        "  safe test channel first."
    );
  }

  const summary = await runDiscordCategorization({
    trigger: "manual",
    dateYmd: args.date,
  });
  console.log("\n=== Discord categorization summary ===");
  console.log(`window           : ${summary.windowStart} → ${summary.windowEnd}`);
  console.log(`messages         : ${summary.totalMessages}`);
  console.log(`channels         : ${summary.channelsProcessed}`);
  console.log(`LLM source       : ${summary.llmSource}`);
  console.log(`Jev model        : ${summary.jevModel ?? "—"}`);
  console.log(`Jev cost (USD)   : $${summary.jevCostUsd.toFixed(4)}`);
  console.log(`posted to        : ${summary.postedToChannelId ?? "—"}`);
  console.log("top categories:");
  for (const t of summary.topCategories) {
    console.log(`  • ${t.category}: ${t.count}`);
  }

  logger.info("discord_categorize.done", summary);

  if (!summary.postedToChannelId) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  logger.error("discord_categorize.fail", { reason: String(err) });
  console.error("FATAL:", err);
  process.exit(1);
});
