import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import {
  isUserAllowed,
  unauthorisedResponse,
} from "@/lib/discord/commands/registry";
import { runDiscordCategorization } from "@/lib/discord/categorize";

/**
 * /categorize-now — privileged. Manually trigger the Jev categorization
 * pipeline that normally runs at 09:00 IST via Vercel Cron.
 */

export async function handleCategorizeNow(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  if (!interaction.user || !isUserAllowed(interaction.user.id)) {
    return unauthorisedResponse();
  }
  return { defer: true };
}

export async function buildCategorizeNowReply(): Promise<InteractionResponseBody> {
  try {
    const summary = await runDiscordCategorization({ trigger: "command" });
    return {
      type: 4,
      data: {
        embeds: [
          {
            title: "Discord categorization · manual run",
            description: [
              `Window: ${summary.windowStart} → ${summary.windowEnd}`,
              `Messages processed: ${summary.totalMessages}`,
              `LLM source: ${summary.llmSource}`,
              `Jev calls: ${summary.jevCalls}`,
              `Channels: ${summary.channelsProcessed}`,
              "",
              "Top categories:",
              ...summary.topCategories.map((t) => `  • ${t.category}: ${t.count}`),
            ]
              .join("\n")
              .slice(0, 1900),
            color: summary.llmSource === "minimax" ? 0xd9a441 : 0xb8512c,
          },
        ],
        allowed_mentions: { parse: [] },
      },
    };
  } catch (err) {
    return {
      type: 4,
      data: {
        content: `❌ Categorization failed: ${(err as Error).message}`,
        allowed_mentions: { parse: [] },
      },
    };
  }
}
