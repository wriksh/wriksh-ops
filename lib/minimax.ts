import "server-only";
import { logger } from "@/lib/logger";

/**
 * MiniMax LLM client wrapper.
 *
 * Wraps the OpenAI-compatible `/chat/completions` endpoint exposed by the
 * MiniMax API. Designed to **fail open**: if the key is missing, the call
 * times out, or the upstream returns a non-2xx, this module throws a typed
 * `MinimaxError` that callers can catch and fall back to a hand-written
 * template. The rest of the system never blocks on the LLM.
 *
 * Add new entry-points here (one per use case) rather than letting callers
 * build raw prompts — keeping prompt design in one file means we can A/B
 * test copy without touching the cron / bot logic.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MinimaxMessageRole = "system" | "user" | "assistant";

export type MinimaxMessage = {
  role: MinimaxMessageRole;
  content: string;
};

export type MinimaxUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type MinimaxChatOptions = {
  /** Override the default model (MINIMAX_MODEL env). */
  model?: string;
  /** Cap completion length. Default 600. */
  maxTokens?: number;
  /** Sampling temperature. Default 0.7. */
  temperature?: number;
  /** Request timeout in ms. Default 20s. */
  timeoutMs?: number;
};

export type MinimaxChatResult = {
  text: string;
  usage: MinimaxUsage;
  model: string;
  /** The duration of the upstream call, used for the audit-log. */
  durationMs: number;
};

/** Thrown for every failure mode — callers should catch and degrade. */
export class MinimaxError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "MinimaxError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function envBaseUrl(): string {
  return process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1";
}

function envModel(): string {
  return process.env.MINIMAX_MODEL || "MiniMax-Text-01";
}

function envApiKey(): string | undefined {
  const k = process.env.MINIMAX_API_KEY;
  return k && k.trim().length > 0 ? k.trim() : undefined;
}

/** Module-level cache so repeated `chat()` calls within a request share state. */
let lastWarnedMissingKey = false;

// ---------------------------------------------------------------------------
// Core: chat() — the only function that actually talks to the network.
// ---------------------------------------------------------------------------

/**
 * Call MiniMax chat completions.
 *
 * Throws MinimaxError if:
 *   - MINIMAX_API_KEY is not set
 *   - the upstream returns a non-2xx
 *   - the request times out
 *   - the response body cannot be parsed
 *
 * The error is always typed — callers should catch MinimaxError specifically.
 */
export async function chat(
  messages: MinimaxMessage[],
  opts: MinimaxChatOptions = {}
): Promise<MinimaxChatResult> {
  const apiKey = envApiKey();
  if (!apiKey) {
    if (!lastWarnedMissingKey) {
      logger.warn("minimax.missing_api_key", {
        hint: "Set MINIMAX_API_KEY in .env.local. All chat() calls will fail until then.",
      });
      lastWarnedMissingKey = true;
    }
    throw new MinimaxError("MINIMAX_API_KEY is not set");
  }

  const url = `${envBaseUrl()}/chat/completions`;
  const body = {
    model: opts.model ?? envModel(),
    messages,
    max_tokens: opts.maxTokens ?? 600,
    temperature: opts.temperature ?? 0.7,
    stream: false,
  };

  const timeoutMs = opts.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new MinimaxError(
        `MiniMax HTTP ${res.status}: ${text.slice(0, 240)}`,
        { status: res.status, body: text.slice(0, 1000) }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new MinimaxError("MiniMax returned empty content");
    }

    const usage: MinimaxUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    return {
      text,
      usage,
      model: data.model ?? body.model,
      durationMs,
    };
  } catch (err) {
    if (err instanceof MinimaxError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new MinimaxError(`MiniMax timed out after ${timeoutMs}ms`, err);
    }
    throw new MinimaxError(
      `MiniMax call failed: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Specialised: dailyDigestPrompt()
//
// Given the structured digest of "today at Wriksh" (today's events +
// recent jobs + finance summary), produce a 1-3 sentence Wriksh-voiced
// intro for the cron-posted Discord message.
//
// Falls back to a deterministic template if MiniMax is unavailable.
// ---------------------------------------------------------------------------

export type DailyDigestContext = {
  today: string; // human-readable, e.g. "Friday 19 September 2026"
  eventsToday: number;
  byCategory: Record<string, number>;
  topEventTitles: string[];
  cataloguesRenderedLast24h: number;
  financeTodayNet: number;
};

const FALLBACK_INTRO = (ctx: DailyDigestContext) =>
  `Good morning from Wriksh. ${ctx.eventsToday} item${ctx.eventsToday === 1 ? "" : "s"} on the calendar today. ` +
  `${ctx.cataloguesRenderedLast24h} catalogue${ctx.cataloguesRenderedLast24h === 1 ? "" : "s"} rendered in the last 24 hours. ` +
  `Net ${ctx.financeTodayNet >= 0 ? "in" : "out"}flow today: ₹${Math.abs(ctx.financeTodayNet).toLocaleString("en-IN")}.`;

const SYSTEM_PROMPT = [
  "You are wrikshbot, the Discord voice of Wriksh — a curated platform for the traditional arts and experiences of India.",
  "Tone: warm, grounded, lightly poetic. Avoid marketing fluff. Reference the philosophy of the Suvarna Yuga of Bharath sparingly.",
  "Length: 2-4 short sentences, under 900 characters.",
  "Format: plain prose, no bullet points, no markdown headers.",
  "Language: English unless the data clearly calls for a regional reference.",
].join(" ");

export async function dailyDigestPrompt(
  ctx: DailyDigestContext
): Promise<{ text: string; source: "minimax" | "fallback"; usage?: MinimaxUsage }> {
  const userPrompt =
    `Today is ${ctx.today}. ` +
    `Calendar: ${ctx.eventsToday} event${ctx.eventsToday === 1 ? "" : "s"}. ` +
    `By category: ${Object.entries(ctx.byCategory)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ") || "none"}. ` +
    `Top events: ${ctx.topEventTitles.slice(0, 3).join("; ") || "none"}. ` +
    `Catalogues rendered in the last 24h: ${ctx.cataloguesRenderedLast24h}. ` +
    `Finance net today: ₹${ctx.financeTodayNet.toLocaleString("en-IN")}. ` +
    `Write the Discord intro.`;

  try {
    const result = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 350, temperature: 0.75 }
    );
    return { text: result.text, source: "minimax", usage: result.usage };
  } catch (err) {
    if (err instanceof MinimaxError) {
      logger.warn("minimax.dailyDigest.fallback", {
        reason: err.message,
      });
    }
    return { text: FALLBACK_INTRO(ctx), source: "fallback" };
  }
}

// ---------------------------------------------------------------------------
// Specialised: askPrompt()
//
// Used by the wrikshbot `/ask` slash command. Wraps the user's question
// with a fresh snapshot of operational context (counts, recent jobs, etc.).
// ---------------------------------------------------------------------------

export type AskContext = {
  today: string;
  statesCount: number;
  catalogueJobsRecent: number;
  marketingEventsToday: number;
  financeNetThisMonth: number;
  openTenders: number;
  discoverArtists: number;
};

const ASK_SYSTEM_PROMPT = [
  "You are wrikshbot, the Wriksh operations assistant. You help the internal team run Wriksh — Discover (booking platform for traditional performances), Experience (curated regional trips), and Learn (long-form apprenticeship programs).",
  "Tone: concise, professional, helpful. Use bullet points for lists.",
  "Length: under 1200 characters.",
  "If the question is outside Wriksh operations, politely redirect to the relevant module.",
  "Today's date is provided in the user message — use it for relative dates.",
].join(" ");

export async function askPrompt(
  question: string,
  ctx: AskContext
): Promise<{ text: string; source: "minimax" | "fallback"; usage?: MinimaxUsage }> {
  const userPrompt =
    `Today is ${ctx.today}.\n` +
    `Live context: ${ctx.statesCount} states, ${ctx.catalogueJobsRecent} catalogues rendered recently, ` +
    `${ctx.marketingEventsToday} marketing events today, finance net this month ₹${ctx.financeNetThisMonth.toLocaleString("en-IN")}, ` +
    `${ctx.openTenders} open tenders, ${ctx.discoverArtists} discover artists.\n\n` +
    `Question: ${question}`;

  try {
    const result = await chat(
      [
        { role: "system", content: ASK_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 600, temperature: 0.5 }
    );
    return { text: result.text, source: "minimax", usage: result.usage };
  } catch (err) {
    if (err instanceof MinimaxError) {
      logger.warn("minimax.ask.fallback", { reason: err.message });
    }
    return {
      text:
        `Sorry — the MiniMax API isn't reachable right now (${err instanceof MinimaxError ? err.message : "unknown error"}). ` +
        `Try again in a minute, or check your MINIMAX_API_KEY in .env.local.`,
      source: "fallback",
    };
  }
}
