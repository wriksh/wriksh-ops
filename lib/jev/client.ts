import "server-only";
import { logger } from "@/lib/logger";

/**
 * Minimal Jev client for the Discord categorization cron.
 *
 * Supports two transports, picked at runtime:
 *
 *   1. Vercel AI Gateway (default) — endpoint `https://ai-gateway.vercel.sh`,
 *      model ID `typesafe-ai/jev`, OpenAI-compatible `/v1/chat/completions`
 *      API. Auth: the same `vck_…` key we already have. Requires a credit
 *      card on the Vercel account to actually serve requests.
 *
 *   2. TypeSafe native (opt-in) — endpoint `https://api.typesafe.ai/v1/systemone`,
 *      model ID `jev-latest`. Native TypeSafe API. Auth: a TypeSafe-issued
 *      `TYPESAFE_API_KEY` (NOT the Vercel key). Enable by setting
 *      `JEV_USE_NATIVE=1` AND providing `TYPESAFE_API_KEY`.
 *
 * Fail-open: every failure returns `null` and logs a warning. Callers
 * handle `null` by falling back to a safe default (e.g. category = "noise").
 *
 * Pricing: $42 / 1B input tokens, output is free per TypeSafe. A single
 * Discord message uses ~150 input tokens → ~$0.0000063 per message. Daily
 * cron over 10k messages ≈ $0.06/day.
 *
 * The full Phase 10.3 Jev integration (retries, rate-limiting, question
 * registry, tagger helpers) lives in a future PR. This client is the
 * minimum needed for the Discord-categorization cron.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type JevScoreQuestion = {
  type: "score";
  instructions: string;
  /** Levels keyed by numeric string ("0", "1", ...). */
  levels: Record<string, string>;
};

export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
};

export type JevQuestion = JevChoiceQuestion | JevScoreQuestion | JevNoulQuestion;
export type JevQuestions = Record<string, JevQuestion>;

export type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type JevScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type JevNoulAnswer = {
  type: "noul";
  noul: number;
};

export type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

export type JevResult = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number };
  /** Approximate cost in USD for this single call. */
  estCostUsd: number;
  durationMs: number;
  /** Which transport served the request. */
  transport: "vercel-gateway" | "typesafe-native";
};

export class JevError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "JevError";
  }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

const INPUT_PRICE_PER_TOKEN = 42 / 1_000_000_000; // $42 / 1B tokens
const OUTPUT_PRICE_PER_TOKEN = 42 / 1_000_000_000; // output "free" — be conservative

// ---------------------------------------------------------------------------
// Transport selection
// ---------------------------------------------------------------------------

type Transport = "vercel-gateway" | "typesafe-native";

function pickTransport(): Transport {
  if (process.env.JEV_USE_NATIVE === "1") {
    return "typesafe-native";
  }
  return "vercel-gateway";
}

function getApiKey(transport: Transport): string | undefined {
  if (transport === "typesafe-native") {
    const k = process.env.TYPESAFE_API_KEY;
    return k && k.trim().length > 0 ? k.trim() : undefined;
  }
  const k = process.env.JEV_API_KEY;
  return k && k.trim().length > 0 ? k.trim() : undefined;
}

let lastWarnedMissingKey = false;
let lastWarnedMissingNativeKey = false;

function warnMissingKey(transport: Transport, tag?: string): void {
  if (transport === "typesafe-native") {
    if (lastWarnedMissingNativeKey) return;
    logger.warn("jev.missing_native_api_key", {
      hint: "Set TYPESAFE_API_KEY (not JEV_API_KEY) to use the native TypeSafe endpoint.",
      tag,
    });
    lastWarnedMissingNativeKey = true;
  } else {
    if (lastWarnedMissingKey) return;
    logger.warn("jev.missing_api_key", {
      hint: "Set JEV_API_KEY (Vercel AI Gateway) or TYPESAFE_API_KEY + JEV_USE_NATIVE=1.",
      tag,
    });
    lastWarnedMissingKey = true;
  }
}

// ---------------------------------------------------------------------------
// Native TypeSafe call (uses native /v1/systemone payload)
// ---------------------------------------------------------------------------

async function callNative(
  state: string | Record<string, unknown>,
  questions: JevQuestions,
  apiKey: string,
  timeoutMs: number
): Promise<JevResult | null> {
  const url = process.env.JEV_BASE_URL
    ? `${process.env.JEV_BASE_URL.replace(/\/$/, "")}/v1/systemone`
    : "https://api.typesafe.ai/v1/systemone";
  return timedFetch(
    url,
    apiKey,
    { model: "jev-latest", state, questions },
    timeoutMs,
    "typesafe-native"
  );
}

// ---------------------------------------------------------------------------
// Vercel AI Gateway call (chat-completions shape, wraps the TypeSafe payload)
// ---------------------------------------------------------------------------

async function callVercel(
  state: string | Record<string, unknown>,
  questions: JevQuestions,
  apiKey: string,
  timeoutMs: number
): Promise<JevResult | null> {
  // Vercel's gateway takes the TypeSafe payload and unwraps it. We send the
  // exact same `{ state, questions }` shape via a single user message so the
  // gateway can parse it. Response is OpenAI-style: choices[0].message.content
  // is a JSON-encoded string of the TypeSafe answer.
  const body = {
    model: "typesafe-ai/jev",
    messages: [
      {
        role: "user" as const,
        content: JSON.stringify({ state, questions }),
      },
    ],
    max_tokens: 1024,
  };
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    const durationMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("jev.http_error", {
        transport: "vercel-gateway",
        status: res.status,
        body: text.slice(0, 240),
      });
      return null;
    }

    const data = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) {
      logger.warn("jev.empty_content", { transport: "vercel-gateway" });
      return null;
    }

    // Strip markdown fences if present.
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    let parsed: {
      model?: string;
      answers?: Record<string, JevAnswer>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      logger.warn("jev.parse_error", {
        transport: "vercel-gateway",
        reason: (err as Error).message,
        contentStart: cleaned.slice(0, 240),
      });
      return null;
    }

    const usage = {
      input_tokens:
        parsed.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0,
      output_tokens:
        parsed.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0,
    };
    const estCostUsd =
      usage.input_tokens * INPUT_PRICE_PER_TOKEN +
      usage.output_tokens * OUTPUT_PRICE_PER_TOKEN;

    return {
      model: parsed.model ?? data.model ?? "typesafe-ai/jev",
      answers: parsed.answers ?? {},
      usage,
      estCostUsd,
      durationMs,
      transport: "vercel-gateway",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn("jev.timeout", { transport: "vercel-gateway" });
    } else {
      logger.warn("jev.error", {
        transport: "vercel-gateway",
        reason: (err as Error).message,
      });
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Shared fetch helper for the native transport
// ---------------------------------------------------------------------------

async function timedFetch(
  url: string,
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
  transport: Transport
): Promise<JevResult | null> {
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
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("jev.http_error", {
        transport,
        status: res.status,
        body: text.slice(0, 240),
      });
      return null;
    }

    const data = (await res.json()) as {
      model?: string;
      answers?: Record<string, JevAnswer>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const usage = {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    };
    const estCostUsd =
      usage.input_tokens * INPUT_PRICE_PER_TOKEN +
      usage.output_tokens * OUTPUT_PRICE_PER_TOKEN;

    return {
      model:
        data.model ??
        (transport === "typesafe-native" ? "jev-latest" : "typesafe-ai/jev"),
      answers: data.answers ?? {},
      usage,
      estCostUsd,
      durationMs: Date.now() - start,
      transport,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn("jev.timeout", { transport });
    } else {
      logger.warn("jev.error", {
        transport,
        reason: (err as Error).message,
      });
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate a Jev question map against the given state.
 *
 * Returns `null` if no API key is configured, the request times out, or
 * the upstream returns a non-2xx. Callers should handle null by falling
 * back to a safe default (e.g. category = "noise").
 */
export async function jevDecide(
  state: string | Record<string, unknown>,
  questions: JevQuestions,
  opts: { timeoutMs?: number; tag?: string } = {}
): Promise<JevResult | null> {
  const transport = pickTransport();
  const apiKey = getApiKey(transport);
  if (!apiKey) {
    warnMissingKey(transport, opts.tag);
    return null;
  }

  const timeoutMs = opts.timeoutMs ?? 8_000;
  if (transport === "typesafe-native") {
    return callNative(state, questions, apiKey, timeoutMs);
  }
  return callVercel(state, questions, apiKey, timeoutMs);
}

/** True if a Jev API key is configured (either transport). */
export function jevEnabled(): boolean {
  const transport = pickTransport();
  return !!getApiKey(transport);
}
