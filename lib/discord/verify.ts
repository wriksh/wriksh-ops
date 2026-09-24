import "server-only";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

/**
 * Discord interaction signature verification (Ed25519).
 *
 * Discord signs every interaction POST with the app's private key and
 * sends two headers:
 *   - `X-Signature-Ed25519`  — hex-encoded signature
 *   - `X-Signature-Timestamp` — unix-ms timestamp string
 *
 * To verify:
 *   1. Reject if either header is missing.
 *   2. Reject if |now - timestamp| > 5 minutes (replay protection).
 *   3. Verify Ed25519(publicKey, timestamp + body, signature) using Node's
 *      built-in `crypto.verify` (algorithm name `null` ⇒ algorithm inferred
 *      from the key, which is Ed25519 here).
 *
 * See https://discord.com/developers/docs/interactions/receiving-and-responding
 *
 * IMPORTANT: this module must run on the Node runtime (uses `node:crypto`).
 * On Vercel Edge runtime, `node:crypto` is not available; we tag the route
 * handlers that import this with `export const runtime = "nodejs"`.
 */

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing_header" | "bad_timestamp" | "stale_timestamp" | "bad_signature" };

/**
 * Verify a Discord interaction request.
 *
 * @param params.publicKeyHex  - `DISCORD_PUBLIC_KEY` from the env (hex)
 * @param params.signatureHex  - value of `X-Signature-Ed25519` header
 * @param params.timestamp     - value of `X-Signature-Timestamp` header
 * @param params.body          - raw request body, as a UTF-8 string
 * @param params.nowMs         - optional override for testability
 */
export function verifyDiscordRequest(params: {
  publicKeyHex: string | undefined;
  signatureHex: string | null;
  timestamp: string | null;
  body: string;
  nowMs?: number;
}): VerifyResult {
  const { publicKeyHex, signatureHex, timestamp } = params;
  if (!publicKeyHex || !signatureHex || !timestamp) {
    return { ok: false, reason: "missing_header" };
  }

  const tsMs = Number(timestamp);
  if (!Number.isFinite(tsMs)) {
    return { ok: false, reason: "bad_timestamp" };
  }

  const now = params.nowMs ?? Date.now();
  if (Math.abs(now - tsMs) > FIVE_MINUTES_MS) {
    logger.warn("discord.verify.stale_timestamp", { nowMs: now, tsMs });
    return { ok: false, reason: "stale_timestamp" };
  }

  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, "hex"),
      format: "der",
      type: "spki",
    });
    const sig = Buffer.from(signatureHex, "hex");
    const data = Buffer.from(`${timestamp}${params.body}`, "utf8");
    // `null` algorithm ⇒ inferred from the key (Ed25519 here).
    const valid = crypto.verify(null, data, key, sig);
    if (!valid) {
      return { ok: false, reason: "bad_signature" };
    }
    return { ok: true };
  } catch (err) {
    logger.warn("discord.verify.error", { reason: (err as Error).message });
    return { ok: false, reason: "bad_signature" };
  }
}

/**
 * Convenience: verify a Next.js `Request` and return both the parsed body
 * (on success) and a structured error (on failure). The raw body must be
 * read as text first because we re-verify the exact bytes Discord signed.
 */
export async function readAndVerifyInteraction(
  req: Request,
  publicKeyHex: string | undefined
): Promise<
  | { ok: true; body: unknown; raw: string }
  | { ok: false; status: 401; error: VerifyResult & { ok: false } }
> {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const raw = await req.text();

  const result = verifyDiscordRequest({
    publicKeyHex,
    signatureHex: signature,
    timestamp,
    body: raw,
  });

  if (!result.ok) {
    return { ok: false, status: 401, error: result };
  }

  try {
    const body = JSON.parse(raw);
    return { ok: true, body, raw };
  } catch {
    return {
      ok: false,
      status: 401,
      error: { ok: false, reason: "bad_signature" },
    };
  }
}
