import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/logout
 *
 * Clears the `wriksh_ops_admin` cookie. Always returns { ok: true }.
 */

const COOKIE_NAME = "wriksh_ops_admin";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  logger.info("admin_logout.ok");
  return res;
}
