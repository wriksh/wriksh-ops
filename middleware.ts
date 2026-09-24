import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Shared-password gate for the Wriksh ops console (Dhoomkethu).
 *
 * Mirrors the behaviour of `wriksh-dev`'s /admin gate:
 *   - Every page and most /api/* routes require a valid `wriksh_ops_admin`
 *     cookie.
 *   - Public webhook + cron endpoints are allowlisted below — they carry
 *     their own strong auth (Ed25519 signature, Bearer secret, or
 *     same-origin check), so they don't need the cookie.
 *   - On a missing/invalid cookie:
 *       * Pages are redirected to /login?next=<original path>.
 *       * API routes return { ok: false, reason: "unauthorized" } with 401.
 *
 * The cookie value is the shared `ADMIN_PASSWORD` itself (same scheme as
 * wriksh-dev) — chosen to match the existing pattern, not for cryptographic
 * strength. Rotating ADMIN_PASSWORD invalidates every active session.
 *
 * Runs on the Edge runtime. We don't need Node `crypto`; a JS-level
 * constant-time string compare is enough here because the secret is short
 * and the attacker already knows its approximate length.
 */

const ADMIN_COOKIE = "wriksh_ops_admin";
const LOGIN_PATH = "/login";
const LOGIN_API = "/api/auth/login";
const LOGOUT_API = "/api/auth/logout";

/**
 * Public API endpoints that must bypass the admin-cookie gate.
 *
 * Each entry's own auth scheme (verified inside the route handler):
 *   - `/api/discord/interactions`        → Ed25519 signature (Discord)
 *   - `/api/discord/register-commands`   → same-origin check
 *   - `/api/discord/cron/*`              → `Authorization: Bearer DISCORD_CRON_SECRET`
 *   - `/api/cron/discord-categorize`     → `Authorization: Bearer DISCORD_CRON_SECRET`
 *   - `/api/cron/channel-health`         → `Authorization: Bearer DISCORD_CRON_SECRET`
 *
 * IMPORTANT: keep this list explicit. Adding a path here means "the
 * route handler is solely responsible for auth."
 */
const PUBLIC_API_PATHS: readonly string[] = [
  LOGIN_API,
  LOGOUT_API,
  "/api/discord/interactions",
  "/api/discord/register-commands",
];

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.includes(pathname)) return true;
  // Allow-list cron subroutes by prefix.
  if (pathname.startsWith("/api/discord/cron/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // --- Public allow-list ---------------------------------------------------
  // Skip the login screen, its API pair, and the public webhook/cron routes.
  if (pathname === LOGIN_PATH || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  // --- Validate the admin cookie -------------------------------------------
  const expected = process.env.ADMIN_PASSWORD;
  const session = req.cookies.get(ADMIN_COOKIE)?.value;

  // If ADMIN_PASSWORD isn't configured, nobody can log in — gate everything.
  // This matches wriksh-dev's posture (the login API returns "not_configured").
  if (expected && session && safeEqual(session, expected)) {
    return NextResponse.next();
  }

  // --- Missing or invalid cookie -------------------------------------------
  const isApi = pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 }
    );
  }

  const loginUrl = new URL(LOGIN_PATH, req.url);
  loginUrl.searchParams.set("next", pathname + (search ?? ""));
  return NextResponse.redirect(loginUrl);
}

/**
 * Constant-time string compare. JS-level rather than Web Crypto because:
 *   - Both inputs are short ASCII (an admin password),
 *   - The secret length is not truly secret — an attacker can guess it.
 * The compare still avoids early-exit on the first mismatching byte so the
 * comparison time doesn't leak content one byte at a time.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // Exclude Next internals + anything with a file extension (assets).
  matcher: ["/((?!_next|.*\\..*).*)"],
};
