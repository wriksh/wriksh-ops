import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

/**
 * /tenders — list up to 10 open tenders sorted by deadline.
 */

export async function handleTenders(
  _interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  return { defer: true };
}

export async function buildTendersReply(): Promise<InteractionResponseBody> {
  try {
    const db = await getDb();
    const docs = await db
      .collection("tenders")
      .find({ status: "open" }, { projection: { _id: 0 } })
      .sort({ deadline: 1 })
      .limit(10)
      .toArray();
    if (docs.length === 0) {
      return {
        type: 4,
        data: { content: "No open tenders right now.", allowed_mentions: { parse: [] } },
      };
    }
    const description = docs
      .map(
        (t) =>
          `• **${t.title}** — ${t.issuingBody} · deadline ${new Date(t.deadline).toLocaleDateString()}` +
          (t.budgetINR ? ` · budget ₹${t.budgetINR.toLocaleString("en-IN")}` : "")
      )
      .join("\n")
      .slice(0, 1900);
    return {
      type: 4,
      data: {
        embeds: [{ title: "Open tenders", description }],
        allowed_mentions: { parse: [] },
      },
    };
  } catch (err) {
    logger.error("discord.command.tenders.fail", { reason: String(err) });
    return {
      type: 4,
      data: {
        content: "❌ Could not load tenders. Check the logs.",
        allowed_mentions: { parse: [] },
      },
    };
  }
}
