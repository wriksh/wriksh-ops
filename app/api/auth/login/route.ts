import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/login
 *
 * Shared-password login for the Wriksh ops console.
 *
 * Body: { password: string }
 * On success: sets the `wriksh_ops_admin` cookie (httpOnly, sameSite=lax,
 *   secure in production, 30-day TTL) and returns { ok: true }.
 * On wrong password: 401 { ok: false, reason: "wrong_password" }.
 * If ADMIN_PASSWORD isn't configured: 500 { ok: false, reason: "not_configured" }.
 *
 * Mirrors the behaviour of wriksh-dev's /api/admin/login; cookie name and
 * route path are swapped to keep the two apps independent.
 */

const COOKIE_NAME = "wriksh_ops_admin";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({ password: "" }));
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    logger.error("admin_login.not_configured");
    return NextResponse.json(
      { ok: false, reason: "not_configured" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    logger.warn("admin_login.wrong_password", { ip: req.headers.get("x-forwarded-for") ?? "unknown" });
    return NextResponse.json(
      { ok: false, reason: "wrong_password" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  logger.info("admin_login.ok", { ip: req.headers.get("x-forwarded-for") ?? "unknown" });
  return res;
}
