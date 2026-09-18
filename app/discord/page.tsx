import ComingSoon from "@/components/ComingSoon";

export default function DiscordPage() {
  return (
    <ComingSoon
      title="Discord · wrikshbot"
      phase="Phase 3"
      pillar="Time"
      description="A Discord bot that mirrors the marketing calendar into the team's channels, posts event reminders, and gives members a `/catalogue <state>` slash command to pull a catalogue PDF on demand."
      bullets={[
        "Discord channel registry stored in `discord_channels`",
        "Auto-post calendar reminders to the matching channel",
        "Slash commands: `/catalogue`, `/finance`, `/artists`",
        "Channel-level opt-in per marketing category",
      ]}
    />
  );
}
