import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

/**
 * /artists [state] — list up to 10 discover artists.
 *
 * Reads from the `discover_artists` collection directly (same query the
 * old wrikshbot used, but without the discord.js wrapper).
 */

function getOption(interaction: ParsedInteraction, name: string): string | undefined {
  const opt = interaction.options?.find((o) => o.name === name);
  return typeof opt?.value === "string" ? opt.value : undefined;
}

export async function handleArtists(
  _interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  // Cheap query, but defer anyway to keep Discord's 3-second budget safe.
  return { defer: true };
}

export async function buildArtistsReply(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody> {
  const stateFilter = getOption(interaction, "state");
  try {
    const db = await getDb();
    const query: Record<string, unknown> = {};
    if (stateFilter) query.stateSlug = stateFilter.toLowerCase();
    const docs = await db
      .collection("discover_artists")
      .find(query, {
        projection: {
          _id: 0,
          name: 1,
          slug: 1,
          stateSlug: 1,
          city: 1,
          artForms: 1,
          ratings: 1,
        },
      })
      .limit(10)
      .toArray();
    if (docs.length === 0) {
      return {
        type: 4,
        data: { content: "No artists found.", allowed_mentions: { parse: [] } },
      };
    }
    const description = docs
      .map((a) => {
        const avg =
          Array.isArray(a.ratings) && a.ratings.length
            ? (
                a.ratings.reduce(
                  (s: number, r: { score: number }) => s + r.score,
                  0
                ) / a.ratings.length
              ).toFixed(1)
            : "—";
        return `**${a.name}** — ${a.city ?? a.stateSlug} · ${(a.artForms ?? []).join(", ")} · ★${avg}`;
      })
      .join("\n")
      .slice(0, 1900);
    return {
      type: 4,
      data: {
        embeds: [
          {
            title: `Discover artists${stateFilter ? ` · ${stateFilter}` : ""}`,
            description,
          },
        ],
        allowed_mentions: { parse: [] },
      },
    };
  } catch (err) {
    logger.error("discord.command.artists.fail", { reason: String(err) });
    return {
      type: 4,
      data: {
        content: "❌ Could not load artists. Check the logs.",
        allowed_mentions: { parse: [] },
      },
    };
  }
}
