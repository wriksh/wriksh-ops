import "server-only";
import { logger } from "@/lib/logger";
import { chat, MinimaxError, type MinimaxUsage } from "@/lib/minimax";
import type { DiscordEmbed } from "@/lib/discord/webhook";
import {
  DISCORD_MESSAGE_CATEGORIES,
  type DiscordMessageCategory,
  type DiscordMessageReportDoc,
} from "@/lib/types";

/**
 * Wriksh-voiced Discord digest summariser.
 *
 * Given per-category counts and a few top authors/channels, ask MiniMax to
 * write a 4–6 sentence summary in Wriksh tone (per docs/WRIKSH.md).
 *
 * Falls back to a deterministic template if MiniMax is unavailable.
 */

const SYSTEM_PROMPT = [
  "You are wrikshbot, the Wriksh operations assistant writing the morning Discord digest.",
  "Tone: warm, grounded, lightly poetic. Reference the philosophy of the Suvarna Yuga of Bharath sparingly.",
  "Length: 4-6 short sentences, under 1100 characters.",
  "Format: plain prose. No bullet points, no markdown headers.",
  "Mention what categories were hot, what was quiet, and any cross-category signal.",
  "Language: English.",
].join(" ");

const FALLBACK_SUMMARY = (ctx: SummaryContext) => {
  const top = ctx.byCategory.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const topLine = top.length > 0 ? top.slice(0, 3).map(([k, n]) => `${n} ${k}`).join(", ") : "no signal";
  return `Yesterday on Discord (${ctx.date}): ${ctx.totalMessages} messages across ${ctx.channelsProcessed} channels. ` +
    `Top activity: ${topLine}. ` +
    `Categorization via Jev (${ctx.jevModel ?? "n/a"}).`;
};

type CategoryCount = [DiscordMessageCategory, number];

export type SummaryContext = {
  date: string;
  totalMessages: number;
  channelsProcessed: number;
  byCategory: CategoryCount[];
  jevModel?: string;
};

export type SummaryResult = {
  text: string;
  source: "minimax" | "fallback";
  usage?: MinimaxUsage;
};

/**
 * Build the user prompt.
 */
function buildPrompt(ctx: SummaryContext): string {
  const lines = [
    `Date: ${ctx.date}.`,
    `Total messages: ${ctx.totalMessages}.`,
    `Channels: ${ctx.channelsProcessed}.`,
    "By category (sorted desc):",
    ...ctx.byCategory.map(([k, n]) => `  - ${k}: ${n}`),
  ];
  return lines.join("\n");
}

export async function summariseDiscordDigest(
  ctx: SummaryContext
): Promise<SummaryResult> {
  const userPrompt = buildPrompt(ctx);
  try {
    const result = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 450, temperature: 0.7 }
    );
    return { text: result.text, source: "minimax", usage: result.usage };
  } catch (err) {
    if (err instanceof MinimaxError) {
      logger.warn("discord.report.fallback", { reason: err.message });
    } else {
      logger.warn("discord.report.fallback", { reason: String(err) });
    }
    return { text: FALLBACK_SUMMARY(ctx), source: "fallback" };
  }
}

/**
 * Build a Discord webhook payload from a finished report.
 * Used both by the cron and the manual command path.
 */
export function buildReportPayload(
  report: Pick<
    DiscordMessageReportDoc,
    "date" | "totalMessages" | "byCategory" | "summary" | "llmSource" | "jevModel" | "channelsProcessed"
  >
): { content?: string; embeds: DiscordEmbed[] } {
  const sortedCats = Object.entries(report.byCategory)
    .filter(([, n]) => (n as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const description = [
    report.summary ?? "",
    "",
    `**Channels:** ${report.channelsProcessed}  ·  **Categorized via:** ${report.jevModel ?? "—"}  ·  **Summary via:** ${report.llmSource}`,
    "",
    "**By category:**",
    ...sortedCats.slice(0, 10).map(([k, v]) => `  • ${k}: ${v}`),
  ]
    .join("\n")
    .slice(0, 1900);

  return {
    embeds: [
      {
        title: `Discord digest · ${report.date}`,
        description,
        color: report.llmSource === "minimax" ? 0xd9a441 : 0xb8512c,
        footer: { text: `wrikshbot · ${report.totalMessages} messages` },
      },
    ],
  };
}

/**
 * Convenience: zero out empty categories so the stored doc only carries
 * the labels we actually saw.
 */
export function normaliseByCategory(
  raw: Partial<Record<DiscordMessageCategory, number>>
): Partial<Record<DiscordMessageCategory, number>> {
  const out: Partial<Record<DiscordMessageCategory, number>> = {};
  for (const k of DISCORD_MESSAGE_CATEGORIES) {
    if (raw[k] && raw[k]! > 0) out[k] = raw[k];
  }
  return out;
}
