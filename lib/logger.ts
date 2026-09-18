import "server-only";

/**
 * Minimal structured logger.
 *
 * We avoid a heavy pino/winston dependency here because (a) wriksh-ops is
 * primarily a Next.js app whose logs go to Vercel's structured log stream
 * (JSON is best), and (b) every module already imports this single file,
 * so swapping the implementation later is a one-file change.
 *
 * Every log line is a single JSON object — easy to grep, easy to forward
 * into Datadog/CloudWatch without extra config. The level + collection +
 * action + duration_ms convention matches the rest of the Wriksh stack.
 */
type Level = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

function emit(level: Level, message: string, fields: LogFields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  });
  // Use the appropriate stdio stream so Vercel's log router picks it up.
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, fields: LogFields = {}) {
    if (process.env.LOG_LEVEL === "debug") emit("debug", message, fields);
  },
  info(message: string, fields: LogFields = {}) {
    emit("info", message, fields);
  },
  warn(message: string, fields: LogFields = {}) {
    emit("warn", message, fields);
  },
  error(message: string, fields: LogFields = {}) {
    emit("error", message, fields);
  },
  /** Time an async action; logs duration_ms on success or error on failure. */
  async timed<T>(
    action: string,
    fields: LogFields,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      emit("info", `${action}.ok`, { action, duration_ms: Date.now() - start, ...fields });
      return result;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      emit("error", `${action}.fail`, { action, duration_ms: Date.now() - start, reason, ...fields });
      throw err;
    }
  },
};
