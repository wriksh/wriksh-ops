import "server-only";
import type { ParsedInteraction } from "@/lib/discord/respond";
import type { InteractionResponseBody } from "@/lib/discord/respond";
import { FLAG_EPHEMERAL } from "@/lib/discord/respond";

/**
 * Single source of truth for wrikshbot's slash commands.
 *
 * Each entry pairs a Discord command definition (for the registration
 * `PUT /commands` call) with a server-side handler that takes the parsed
 * interaction and returns a response body.
 *
 * Handlers MUST be pure async functions that take a ParsedInteraction and
 * return either a `InteractionResponseBody` (will be POSTed back to
 * Discord as the immediate reply) OR `null` (signals "I've already
 * deferred, will edit the original later via `editOriginal`/`followUp`).
 */

export type CommandDefinition = {
  /** Slash command name. Lowercase, 1-32 chars, must match Discord's regex. */
  name: string;
  /** 1-100 chars. */
  description: string;
  /** Option list per Discord's spec. Empty array = no options. */
  options?: {
    name: string;
    description: string;
    type: number; // 1=SUB_COMMAND 2=SUB_COMMAND_GROUP 3=STRING 4=INTEGER ...
    required?: boolean;
    max_length?: number;
  }[];
  /**
   * Optional allow-list. If set, only the listed user IDs may invoke.
   * Source: WRIKSHBOT_ALLOWED_USER_IDS env var (comma-separated).
   * Empty = everyone in the guild.
   */
  privileged?: boolean;
};

export type CommandHandler = (
  interaction: ParsedInteraction
) => Promise<InteractionResponseBody | { defer: true; ephemeral?: boolean } | null>;

/**
 * Convert a definition into the JSON shape Discord's `PUT /commands` wants.
 */
export function toDiscordCommand(def: CommandDefinition): Record<string, unknown> {
  return {
    name: def.name,
    description: def.description,
    options: def.options ?? [],
  };
}

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: "today",
    description: "Show today's marketing calendar + finance + recent catalogues.",
  },
  {
    name: "ask",
    description: "Ask wrikshbot a question. Powered by MiniMax with live MongoDB context.",
    privileged: true,
    options: [
      {
        name: "question",
        description: "Your question",
        type: 3, // STRING
        required: true,
        max_length: 500,
      },
    ],
  },
  {
    name: "catalogue",
    description: "Render and post a state catalogue PDF.",
    options: [
      {
        name: "state",
        description: "State slug, e.g. karnataka",
        type: 3,
        required: true,
        max_length: 64,
      },
    ],
  },
  {
    name: "artists",
    description: "List discover artists (optionally filtered by state).",
    options: [
      {
        name: "state",
        description: "Optional state slug",
        type: 3,
        required: false,
        max_length: 64,
      },
    ],
  },
  {
    name: "tenders",
    description: "List open government/institutional tenders.",
  },
  {
    name: "categorize-now",
    description: "Run the Jev Discord categorization pipeline immediately.",
    privileged: true,
  },
  {
    name: "digest-report",
    description: "Fetch the most recent daily Discord categorization report.",
    privileged: true,
    options: [
      {
        name: "date",
        description: "Date in YYYY-MM-DD (defaults to today)",
        type: 3,
        required: false,
        max_length: 10,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Handler registry — populated below by importing the per-command files.
// ---------------------------------------------------------------------------

import { handleToday } from "@/lib/discord/commands/today";
import { handleAsk } from "@/lib/discord/commands/ask";
import { handleCatalogue } from "@/lib/discord/commands/catalogue";
import { handleArtists } from "@/lib/discord/commands/artists";
import { handleTenders } from "@/lib/discord/commands/tenders";
import { handleCategorizeNow } from "@/lib/discord/commands/categorizeNow";
import { handleDigestReport } from "@/lib/discord/commands/digestReport";

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  today: handleToday,
  ask: handleAsk,
  catalogue: handleCatalogue,
  artists: handleArtists,
  tenders: handleTenders,
  "categorize-now": handleCategorizeNow,
  "digest-report": handleDigestReport,
};

// ---------------------------------------------------------------------------
// Permission gate (mirrors the old wrikshbot behaviour)
// ---------------------------------------------------------------------------

function parseAllowedUserIds(): string[] {
  return (process.env.WRIKSHBOT_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isUserAllowed(userId: string): boolean {
  const allow = parseAllowedUserIds();
  return allow.length === 0 || allow.includes(userId);
}

/**
 * Return an "unauthorised" ephemeral response if the user is not allowed.
 */
export function unauthorisedResponse(): InteractionResponseBody {
  return {
    type: 4,
    data: {
      content: "⛔ You don't have permission to use this command.",
      flags: FLAG_EPHEMERAL,
      allowed_mentions: { parse: [] },
    },
  };
}
