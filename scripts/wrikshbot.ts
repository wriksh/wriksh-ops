/**
 * scripts/wrikshbot.ts
 *
 * wrikshbot — a Discord bot connected via the gateway, exposing slash
 * commands to the Wriksh team:
 *
 *   /today                — same digest the cron posts, inline
 *   /ask <question>       — MiniMax-powered Q&A over live MongoDB context
 *   /catalogue <state>    — renders a state catalogue PDF, posts it as an
 *                           attachment in the channel
 *   /artists [state]      — lists discover_artists (filtered if a state is given)
 *   /tenders              — lists open government/institutional tenders
 *
 * The bot process also runs the daily cron in-process via node-cron, so
 * a single long-running deployment handles both the interactive + scheduled
 * sides of Phase 3.
 *
 * Run locally:
 *   npm run bot
 *
 * Deploy:
 *   Dockerfile in the repo root + `fly deploy` (or any always-on host).
 */

import "dotenv/config";
import cron from "node-cron";
import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { logger } from "../lib/logger";
import { runDailyDigest } from "../lib/discord/dailyDigest";
import { askPrompt } from "../lib/minimax";
import { listStates } from "../lib/collections/states";
import { countArtists, countTenders } from "../lib/collections/artists";
import { listRecentCatalogueJobs } from "../lib/collections/catalogue";
import { countMarketingEventsByCategory } from "../lib/collections/marketing";
import { summariseFinance } from "../lib/collections/finance";
import { getDb } from "../lib/mongodb";
import { renderCataloguePdfBuffer } from "../lib/catalogue/render";

// ---------------------------------------------------------------------------
// Config & helpers
// ---------------------------------------------------------------------------

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ALLOWED_USER_IDS = (process.env.WRIKSHBOT_ALLOWED_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is not set. Refusing to start.");
  process.exit(1);
}
if (!GUILD_ID) {
  console.error("DISCORD_GUILD_ID is not set. Refusing to start.");
  process.exit(1);
}

function userAllowed(userId: string): boolean {
  return ALLOWED_USER_IDS.length === 0 || ALLOWED_USER_IDS.includes(userId);
}

async function ephemeral(interaction: ChatInputCommandInteraction, content: string) {
  return interaction.reply({ content, ephemeral: true });
}

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("today")
    .setDescription("Show today's marketing calendar + finance + recent catalogues.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask wrikshbot a question. Powered by MiniMax with live MongoDB context.")
    .addStringOption((opt) =>
      opt.setName("question").setDescription("Your question").setRequired(true).setMaxLength(500)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("catalogue")
    .setDescription("Render and post a state catalogue PDF.")
    .addStringOption((opt) =>
      opt.setName("state").setDescription("State slug, e.g. karnataka").setRequired(true).setMaxLength(64)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("artists")
    .setDescription("List discover artists (optionally filtered by state).")
    .addStringOption((opt) =>
      opt.setName("state").setDescription("Optional state slug").setRequired(false).setMaxLength(64)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("tenders")
    .setDescription("List open government/institutional tenders.")
    .toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN!);
  await rest.put(Routes.applicationGuildCommands(APP_ID ?? "", GUILD_ID!), {
    body: commands,
  });
  logger.info("wrikshbot.commands.registered", { count: commands.length });
}

// We need the application ID to register guild-scoped commands. discord.js
// exposes it on Client#user after `ready`.
let APP_ID: string | null = null;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleToday(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });
  const tz = process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata";
  const result = await runDailyDigest({ dryRun: true, tz, triggeredBy: "bot:/today" });
  const payload = result.payloadPreview!;
  // discord.js API doesn't accept raw webhook-shaped embeds directly when
  // replying via interaction — convert each to EmbedBuilder.
  const embeds = (payload.embeds ?? []).map(
    (e) =>
      new EmbedBuilder({
        title: e.title?.slice(0, 256),
        description: e.description?.slice(0, 1024),
        color: e.color,
        fields: e.fields?.slice(0, 25).map((f) => ({
          name: f.name.slice(0, 256),
          value: f.value.slice(0, 1024),
          inline: f.inline,
        })),
        footer: e.footer ? { text: e.footer.text.slice(0, 2048) } : undefined,
        timestamp: e.timestamp,
      })
  );
  // Discord caps replies at 10 embeds — split into follow-ups if needed.
  const first = embeds.slice(0, 10);
  const rest = embeds.slice(10);
  await interaction.editReply({
    content: payload.content ?? undefined,
    embeds: first,
  });
  for (let i = 0; i < rest.length; i += 10) {
    await interaction.followUp({
      embeds: rest.slice(i, i + 10),
      ephemeral: false,
    });
  }
}

async function handleAsk(interaction: ChatInputCommandInteraction) {
  if (!userAllowed(interaction.user.id)) {
    return ephemeral(interaction, "⛔ You don't have permission to use /ask.");
  }
  const question = interaction.options.getString("question", true);
  await interaction.deferReply({ ephemeral: false });

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

  const embed = new EmbedBuilder()
    .setTitle("wrikshbot")
    .setDescription(result.text.slice(0, 1900))
    .setFooter({ text: `source: ${result.source}` })
    .setColor(result.source === "minimax" ? 0xd9a441 : 0xb8512c);

  await interaction.editReply({ embeds: [embed] });
}

async function handleCatalogue(interaction: ChatInputCommandInteraction) {
  const stateSlug = interaction.options.getString("state", true).toLowerCase().trim();
  if (!/^[a-z0-9-]+$/.test(stateSlug)) {
    return ephemeral(interaction, "Invalid state slug.");
  }
  await interaction.deferReply({ ephemeral: false });
  try {
    const { buffer, stateName } = await renderCataloguePdfBuffer(stateSlug);
    const attachment = new AttachmentBuilder(buffer, {
      name: `wriksh-${stateSlug}-catalogue.pdf`,
    });
    await interaction.editReply({
      content: `📘 Here is the **${stateName}** catalogue (${(buffer.byteLength / 1024).toFixed(0)} KB).`,
      files: [attachment],
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await interaction.editReply(`❌ Could not render catalogue: ${reason}`);
  }
}

async function handleArtists(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });
  const stateFilter = interaction.options.getString("state");
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (stateFilter) query.stateSlug = stateFilter.toLowerCase();
  const docs = await db
    .collection("discover_artists")
    .find(query, { projection: { _id: 0, name: 1, slug: 1, stateSlug: 1, city: 1, artForms: 1, ratings: 1 } })
    .limit(10)
    .toArray();
  if (docs.length === 0) {
    return interaction.editReply("No artists found.");
  }
  const embed = new EmbedBuilder()
    .setTitle(`Discover artists${stateFilter ? ` · ${stateFilter}` : ""}`)
    .setDescription(
      docs
        .map((a) => {
          const avg =
            Array.isArray(a.ratings) && a.ratings.length
              ? (
                  a.ratings.reduce((s: number, r: { score: number }) => s + r.score, 0) /
                  a.ratings.length
                ).toFixed(1)
              : "—";
          return `**${a.name}** — ${a.city ?? a.stateSlug} · ${(a.artForms ?? []).join(", ")} · ★${avg}`;
        })
        .join("\n")
    );
  await interaction.editReply({ embeds: [embed] });
}

async function handleTenders(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });
  const db = await getDb();
  const docs = await db
    .collection("tenders")
    .find({ status: "open" }, { projection: { _id: 0 } })
    .sort({ deadline: 1 })
    .limit(10)
    .toArray();
  if (docs.length === 0) {
    return interaction.editReply("No open tenders right now.");
  }
  const embed = new EmbedBuilder()
    .setTitle("Open tenders")
    .setDescription(
      docs
        .map(
          (t) =>
            `• **${t.title}** — ${t.issuingBody} · deadline ${new Date(t.deadline).toLocaleDateString()}` +
            (t.budgetINR ? ` · budget ₹${t.budgetINR.toLocaleString("en-IN")}` : "")
        )
        .join("\n")
    );
  await interaction.editReply({ embeds: [embed] });
}

// ---------------------------------------------------------------------------
// Client + lifecycle
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  APP_ID = c.user.id;
  logger.info("wrikshbot.ready", { user: c.user.tag, appId: APP_ID, guilds: c.guilds.cache.size });
  try {
    await registerCommands();
  } catch (err) {
    logger.error("wrikshbot.commands.failed", { reason: String(err) });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  logger.info("wrikshbot.command", {
    command: interaction.commandName,
    user: interaction.user.tag,
  });
  try {
    switch (interaction.commandName) {
      case "today":
        return await handleToday(interaction);
      case "ask":
        return await handleAsk(interaction);
      case "catalogue":
        return await handleCatalogue(interaction);
      case "artists":
        return await handleArtists(interaction);
      case "tenders":
        return await handleTenders(interaction);
      default:
        return ephemeral(interaction, "Unknown command.");
    }
  } catch (err) {
    logger.error("wrikshbot.command.failed", {
      command: interaction.commandName,
      reason: String(err),
    });
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Something went wrong. Check the logs.");
    } else {
      await ephemeral(interaction, "❌ Something went wrong. Check the logs.");
    }
  }
});

// ---------------------------------------------------------------------------
// Daily cron — run inside the same process via node-cron
// ---------------------------------------------------------------------------

function scheduleDailyCron() {
  const hour = Number(process.env.DISCORD_CRON_HOUR ?? 8);
  const minute = Number(process.env.DISCORD_CRON_MINUTE ?? 0);
  // node-cron uses 5-field expressions: "min hour dom mon dow"
  const expr = `${minute} ${hour} * * *`;
  const tz = process.env.DISCORD_CRON_TZ ?? "Asia/Kolkata";
  cron.schedule(
    expr,
    async () => {
      logger.info("wrikshbot.cron.tick", { hour, minute, tz });
      try {
        await runDailyDigest({ tz, triggeredBy: "wrikshbot:cron" });
      } catch (err) {
        logger.error("wrikshbot.cron.fail", { reason: String(err) });
      }
    },
    { timezone: tz }
  );
  logger.info("wrikshbot.cron.scheduled", { expr, tz });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

scheduleDailyCron();
client.login(TOKEN);

function shutdown(signal: string) {
  logger.info("wrikshbot.shutdown", { signal });
  client.destroy();
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
