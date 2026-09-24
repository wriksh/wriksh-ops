import DiscordAdmin from "@/components/discord/DiscordAdmin";
import { listDiscordChannels } from "@/lib/collections/discord";
import { listRecentCronRuns, getLastCronRun } from "@/lib/collections/cron";

/**
 * /discord — admin console for Phase 3.
 *
 * Server-fetches all data, then hands off to the client component for
 * interactive CRUD + cron triggering. Bot env flags are passed down as
 * `NEXT_PUBLIC_*` so the client can render the health card without
 * leaking the actual token.
 */
export default async function DiscordAdminPage() {
  const [channels, recentRuns, lastRun] = await Promise.all([
    listDiscordChannels(),
    listRecentCronRuns(10),
    getLastCronRun("daily-reminder"),
  ]);

  // Surface the same env flags to the client (true/false, not the values).
  const botEnv = {
    hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID ?? "",
    cronHour: process.env.DISCORD_CRON_HOUR ?? "8",
    cronMinute: process.env.DISCORD_CRON_MINUTE ?? "0",
    cronTz: process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata",
    hasCronSecret: !!process.env.DISCORD_CRON_SECRET,
    allowedUserCount: (process.env.WRIKSHBOT_ALLOWED_USER_IDS ?? "")
      .split(",")
      .filter((s) => s.trim().length > 0).length,
  };

  return (
    <DiscordAdmin
      channels={channels}
      recentRuns={recentRuns}
      lastRun={lastRun ?? null}
      botEnv={botEnv}
    />
  );
}
