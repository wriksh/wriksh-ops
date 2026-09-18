import { NextResponse } from "next/server";
import { listRecentCatalogueJobs } from "@/lib/collections/catalogue";

/**
 * GET /api/catalogue/[state]
 *
 * Returns a small JSON payload describing the state catalogue:
 *   - last 5 catalogue jobs for that state (audit trail)
 *   - whether a catalogue_overrides doc exists
 *
 * Used by the cataloguing admin UI to show "last generated" badges.
 */
export async function GET(
  _req: Request,
  { params }: { params: { state: string } }
) {
  const stateSlug = (params.state || "").toLowerCase().trim();
  if (!stateSlug) {
    return NextResponse.json({ error: "invalid state slug" }, { status: 400 });
  }
  const jobs = await listRecentCatalogueJobs(50);
  const stateJobs = jobs.filter((j) => j.stateSlug === stateSlug).slice(0, 5);
  return NextResponse.json({ state: stateSlug, recentJobs: stateJobs });
}
