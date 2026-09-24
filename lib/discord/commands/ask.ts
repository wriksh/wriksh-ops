import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import { askPrompt } from "@/lib/minimax";
import { listStates } from "@/lib/collections/states";
import { listRecentCatalogueJobs } from "@/lib/collections/catalogue";
import { countMarketingEventsByCategory } from "@/lib/collections/marketing";
import { summariseFinance } from "@/lib/collections/finance";
import { countArtists, countTenders } from "@/lib/collections/artists";
import {
  isUserAllowed,
  unauthorisedResponse,
} from "@/lib/discord/commands/registry";

/**
 * /ask <question> — privileged. MiniMax-powered Q&A over live Mongo context.
 */

function getOption(interaction: ParsedInteraction, name: string): string | undefined {
  const opt = interaction.options?.find((o) => o.name === name);
  return typeof opt?.value === "string" ? opt.value : undefined;
}

export async function handleAsk(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  if (!interaction.user || !isUserAllowed(interaction.user.id)) {
    return unauthorisedResponse();
  }
  return { defer: true };
}

export async function buildAskReply(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody> {
  if (!interaction.user || !isUserAllowed(interaction.user.id)) {
    return unauthorisedResponse();
  }
  const question = getOption(interaction, "question") ?? "";
  if (!question) {
    return {
      type: 4,
      data: { content: "Please provide a question.", allowed_mentions: { parse: [] } },
    };
  }

  const [states, recentJobs, marketingCounts, finance, tenders, artists] = await Promise.all([
    listStates(),
    listRecentCatalogueJobs(5),
    countMarketingEventsByCategory(),
    summariseFinance(),
    countTenders(),
    countArtists(),
  ]);

  const todayHuman = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const result = await askPrompt(question, {
    today: todayHuman,
    statesCount: states.length,
    catalogueJobsRecent: recentJobs.length,
    marketingEventsToday: Object.values(marketingCounts).reduce((a, b) => a + b, 0),
    financeNetThisMonth: finance.thisMonth.net,
    openTenders: tenders.open,
    discoverArtists: artists,
  });

  return {
    type: 4,
    data: {
      embeds: [
        {
          title: "wrikshbot",
          description: result.text.slice(0, 1900),
          color: result.source === "minimax" ? 0xd9a441 : 0xb8512c,
          footer: { text: `source: ${result.source}` },
        },
      ],
      allowed_mentions: { parse: [] },
    },
  };
}
