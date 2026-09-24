import "server-only";
import { logger } from "@/lib/logger";
import { jevDecide, jevEnabled } from "@/lib/jev/client";
import {
  DISCORD_MESSAGE_CATEGORIES,
  type DiscordMessageCategory,
} from "@/lib/types";

/**
 * Jev-backed Discord-message categorization.
 *
 * Given a single Discord message, ask Jev to pick one of the fixed labels
 * in `DISCORD_MESSAGE_CATEGORIES` and return the result with confidence.
 * Falls back to "noise" if Jev is disabled or fails.
 */

const CATEGORY_DESCRIPTIONS: Record<DiscordMessageCategory, string> = {
  marketing:   "post-launch talk, ad performance, social engagement, channel growth.",
  finance:     "invoice, payment, expense, vendor conversation, money movement.",
  catalogue:   "state catalogue feedback, tradition review, content corrections.",
  people:      "artist / guide / host intro or verification, talent talk.",
  library:     "doc upload, runbook, brand reference, knowledge-base link.",
  infra:       "cron, bot, API, deployment, server-side engineering talk.",
  memoir:      "reflection, weekly notes, founder thinking.",
  coordination:"internal scheduling, \"can you check X\", standup-style chatter.",
  support:     "external user/stakeholder question, customer support.",
  noise:       "emoji-only, greetings, off-topic, very short non-actionable chat.",
};

const CATEGORIZE_INSTRUCTIONS =
  "Pick the single best Wriksh-ops category for this Discord message. " +
  "Consider both the topic and the action it implies. " +
  "If the message is too short to be actionable or is purely social, choose noise. " +
  "If it spans two categories, pick the dominant intent.";

export type CategorizeResult = {
  category: DiscordMessageCategory;
  confidence: number;
  /** Empty string means Jev was unavailable; we returned a fallback. */
  jevModel?: string;
  needsReview: boolean;
};

/** Build the criteria map for the Choice question. */
function buildCriteria(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const c of DISCORD_MESSAGE_CATEGORIES) {
    out[c] = CATEGORY_DESCRIPTIONS[c];
  }
  return out;
}

/**
 * Categorize a single Discord message. Always returns a result; if Jev is
 * disabled or fails, returns `noise` with `confidence: 0`.
 */
export async function categorizeDiscordMessage(input: {
  content: string;
  channelSlug?: string;
  authorName?: string;
}): Promise<CategorizeResult> {
  if (!jevEnabled() || input.content.trim().length < 4) {
    return { category: "noise", confidence: 0, needsReview: false };
  }

  const state = {
    content: input.content.slice(0, 500),
    channel: input.channelSlug ?? "",
    author: input.authorName ?? "",
  };
  const questions = {
    category: {
      type: "choice" as const,
      instructions: CATEGORIZE_INSTRUCTIONS,
      criteria: buildCriteria(),
    },
  };

  const result = await jevDecide(state, questions, { tag: "categorizeDiscordMessage" });
  if (!result) {
    return { category: "noise", confidence: 0, needsReview: false };
  }
  const ans = result.answers.category;
  if (!ans || ans.type !== "choice") {
    logger.warn("jev.categorize.unexpected_answer_shape", {
      type: (ans as { type?: string } | undefined)?.type,
    });
    return { category: "noise", confidence: 0, needsReview: false };
  }
  const category = (DISCORD_MESSAGE_CATEGORIES as readonly string[]).includes(ans.choice)
    ? (ans.choice as DiscordMessageCategory)
    : "noise";
  const needsReview = ans.confidence < 0.6;
  return {
    category,
    confidence: ans.confidence,
    jevModel: result.model,
    needsReview,
  };
}
