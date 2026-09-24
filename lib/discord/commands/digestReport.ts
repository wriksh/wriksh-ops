import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import {
  isUserAllowed,
  unauthorisedResponse,
} from "@/lib/discord/commands/registry";
import { getReportByDate } from "@/lib/collections/discordCategories";

/**
 * /digest-report [date] — privileged. Fetch a stored Discord categorization
 * report by date (defaults to today in IST).
 */

function getOption(interaction: ParsedInteraction, name: string): string | undefined {
  const opt = interaction.options?.find((o) => o.name === name);
  return typeof opt?.value === "string" ? opt.value : undefined;
}

function todayIst(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export async function handleDigestReport(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  if (!interaction.user || !isUserAllowed(interaction.user.id)) {
    return unauthorisedResponse();
  }
  return { defer: true };
}

export async function buildDigestReportReply(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody> {
  if (!interaction.user || !isUserAllowed(interaction.user.id)) {
    return unauthorisedResponse();
  }
  const date = getOption(interaction, "date") ?? todayIst();
  const report = await getReportByDate(date);
  if (!report) {
    return {
      type: 4,
      data: {
        embeds: [
          {
            title: `Discord digest · ${date}`,
            description: "No report found for that date yet. Try `/categorize-now` to generate one.",
          },
        ],
        allowed_mentions: { parse: [] },
      },
    };
  }
  const lines = [
    `Total messages: ${report.totalMessages}`,
    `Channels: ${report.channelsProcessed}`,
    `LLM source: ${report.llmSource}`,
    `Jev model: ${report.jevModel ?? "—"}`,
    "",
    "By category:",
    ...Object.entries(report.byCategory)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([k, v]) => `  • ${k}: ${v}`),
  ];
  return {
    type: 4,
    data: {
      embeds: [
        {
          title: `Discord digest · ${report.date}`,
          description: lines.join("\n").slice(0, 1900),
          color: report.llmSource === "minimax" ? 0xd9a441 : 0xb8512c,
          footer: { text: `generated ${new Date(report.generatedAt).toLocaleString()}` },
        },
      ],
      allowed_mentions: { parse: [] },
    },
  };
}
