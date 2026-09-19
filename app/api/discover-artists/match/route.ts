import { NextResponse } from "next/server";
import { listPeople } from "@/lib/collections/people";
import { matchArtists, type MatchBrief } from "@/lib/matching/score";
import { logger } from "@/lib/logger";

/**
 * POST /api/discover-artists/match
 *
 * Body: { artForms: string[], budgetINR?: number, cityHint?: string, coords?: [lng, lat] }
 * Returns: top 5 matched artists with score + reasons.
 *
 * Source: the unified `people` collection, filtered to role=artist. The
 * legacy `discover_artists` collection stays for backward compat with
 * the old page (now redirected) and the Discord bot.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MatchBrief;
    if (!Array.isArray(body.artForms) || body.artForms.length === 0) {
      return NextResponse.json(
        { error: "artForms (non-empty array) is required" },
        { status: 400 }
      );
    }
    const pool = await listPeople({ roles: ["artist"], limit: 500 });
    const results = matchArtists(body, pool, 5);
    logger.info("matching.run", {
      poolSize: pool.length,
      resultsCount: results.length,
      artForms: body.artForms,
      budgetINR: body.budgetINR,
    });
    return NextResponse.json({
      poolSize: pool.length,
      results,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
