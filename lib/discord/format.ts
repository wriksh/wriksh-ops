import "server-only";
import type { DiscordEmbed, DiscordWebhookPayload } from "@/lib/discord/webhook";
import type { TodayContext } from "@/lib/discord/today";
import {
  MARKETING_CATEGORY_COLOR,
  MARKETING_CATEGORY_LABELS,
  type MarketingCategory,
} from "@/lib/types";

/**
 * Discord embed formatter.
 *
 * Pure functions — given a `TodayContext` and (optionally) an LLM-written
 * intro, produce the JSON payload that `postToDiscord` will send.
 *
 * Per Discord limits:
 *   - max 10 embeds per message
 *   - max 6000 chars across all embeds + content
 *   - max 1024 chars per embed description
 *   - max 256 chars per embed title
 *   - max 25 fields per embed
 *   - max 1024 chars per field value
 *
 * The formatter stays well within those — we cap event embeds at 10 and
 * split into multiple messages via `chunkEmbeds` in webhook.ts.
 */

// Brand palette → decimal RGB (Discord color is 24-bit decimal).
const BRAND_COLOR = {
  gold: 0xc8_93_2f,
  clay: 0xb8_51_2c,
  forest: 0x2d_45_21,
  moss: 0x5c_7b_3f,
  rust: 0xc7_60_3a,
  umber: 0x6e_4b_25,
};

const FOOTER_TEXT = "wriksh-ops · Dhoomkethu";

/** Hex string (#RRGGBB) → decimal color int for Discord embeds. */
function hexToInt(hex: string): number {
  const clean = hex.replace("#", "");
  return parseInt(clean, 16);
}

/** Best-guess category → decimal color for event embeds. */
function colorForCategory(cat: string): number {
  // MarketingEvent category maps to its CSS color via MARKETING_CATEGORY_COLOR,
  // but that's a Tailwind class string, not a hex. We keep a small lookup
  // mirroring lib/types.ts.
  switch (cat as MarketingCategory) {
    case "post":
      return BRAND_COLOR.gold;
    case "meeting":
      return BRAND_COLOR.clay;
    case "experience":
      return BRAND_COLOR.moss;
    case "collab":
      return BRAND_COLOR.forest;
    case "ad":
      return BRAND_COLOR.rust;
    case "app-dev":
      return BRAND_COLOR.umber;
    default:
      return hexToInt("#C9B98C"); // stone fallback
  }
}

const CATEGORY_EMOJI: Record<MarketingCategory, string> = {
  post: "✍️",
  meeting: "📅",
  experience: "🎭",
  collab: "🤝",
  ad: "📣",
  "app-dev": "🛠️",
};

function fmtINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Build the daily-digest Discord message.
 *
 * Returns a *single* message payload (potentially with several embeds).
 * The cron caller is responsible for chunking if there are more than 10
 * event embeds — at 10 we already hit Discord's per-message cap, so
 * callers should use `chunkEmbeds`.
 */
export function buildDailyDigestMessage(
  ctx: TodayContext,
  intro: string
): DiscordWebhookPayload {
  const summaryEmbed: DiscordEmbed = {
    title: `🪔 Today at Wriksh · ${ctx.todayHuman}`,
    description: intro,
    color: hexToInt("#D9A441"),
    timestamp: ctx.assembledAt,
    footer: { text: FOOTER_TEXT },
    fields: [
      {
        name: "Calendar",
        value:
          ctx.eventsToday.length === 0
            ? "No events today"
            : `${ctx.eventsToday.length} event${ctx.eventsToday.length === 1 ? "" : "s"} scheduled`,
        inline: true,
      },
      {
        name: "Catalogues · last 24h",
        value: `${ctx.catalogueJobsRecent} rendered`,
        inline: true,
      },
      {
        name: "Finance · last 24h",
        value: `${ctx.financeLast24hCount} tx · net ${fmtINR(ctx.financeLast24hNet)}`,
        inline: true,
      },
      ...buildCategoryFields(ctx),
    ],
  };

  const eventEmbeds: DiscordEmbed[] = ctx.eventsToday.map((e) => ({
    title: `${CATEGORY_EMOJI[e.category] ?? "•"} ${e.title}`,
    description: e.notes?.slice(0, 500) || undefined,
    color: colorForCategory(e.category),
    fields: [
      { name: "Category", value: MARKETING_CATEGORY_LABELS[e.category] ?? e.category, inline: true },
      ...(e.owner ? [{ name: "Owner", value: e.owner, inline: true }] : []),
      ...(e.channel ? [{ name: "Channel", value: e.channel, inline: true }] : []),
      {
        name: "When",
        value: formatEventDateRange(e.date, e.endDate),
        inline: false,
      },
    ],
    footer: { text: FOOTER_TEXT },
    timestamp: ctx.assembledAt,
  }));

  const financeEmbed: DiscordEmbed = {
    title: "💸 Finance · last 24 hours",
    color:
      ctx.financeLast24hNet >= 0 ? BRAND_COLOR.moss : BRAND_COLOR.rust,
    fields: [
      { name: "Income", value: fmtINR(ctx.financeLast24hIncome), inline: true },
      { name: "Expense", value: fmtINR(ctx.financeLast24hExpense), inline: true },
      { name: "Net", value: fmtINR(ctx.financeLast24hNet), inline: true },
      { name: "Transactions", value: String(ctx.financeLast24hCount), inline: true },
    ],
    footer: { text: FOOTER_TEXT },
    timestamp: ctx.assembledAt,
  };

  return {
    username: "wriksh-ops",
    content: undefined, // text is in the summary embed description
    embeds: [summaryEmbed, ...eventEmbeds, financeEmbed],
  };
}

function buildCategoryFields(ctx: TodayContext): { name: string; value: string; inline: boolean }[] {
  const cats = Object.entries(ctx.byCategory).filter(([, n]) => n > 0);
  if (cats.length === 0) return [];
  // Render as a single multi-line value to keep the embed compact.
  return [
    {
      name: "By category",
      value: cats.map(([k, n]) => `${MARKETING_CATEGORY_LABELS[k as MarketingCategory] ?? k}: ${n}`).join("\n"),
      inline: false,
    },
  ];
}

function formatEventDateRange(startIso: string, endIso?: string): string {
  const start = new Date(startIso);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  if (!endIso) return new Intl.DateTimeFormat("en-GB", opts).format(start);
  const end = new Date(endIso);
  return `${new Intl.DateTimeFormat("en-GB", opts).format(start)} → ${new Intl.DateTimeFormat("en-GB", opts).format(end)}`;
}

/**
 * Build a minimal `/today` reply for a slash command — same data, but
 * the message is targeted at the user who asked, not a channel.
 */
export function buildTodayReply(ctx: TodayContext, intro: string): DiscordWebhookPayload {
  return buildDailyDigestMessage(ctx, intro);
}
