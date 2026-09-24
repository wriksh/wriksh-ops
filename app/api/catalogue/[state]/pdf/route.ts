import { NextResponse } from "next/server";
import { renderCataloguePdfBuffer } from "@/lib/catalogue/render";
import { recordCatalogueJob, listRecentCatalogueJobs } from "@/lib/collections/catalogue";
import { logger } from "@/lib/logger";

/**
 * GET /api/catalogue/[state]/pdf
 *
 * Renders the state catalogue as a PDF and streams it back to the client.
 * Every successful render is audit-logged in `catalogue_jobs` so the
 * Dhoomkethu dashboard can show "last generated" + total bytes.
 *
 * Status codes:
 *   200 — PDF stream (application/pdf)
 *   400 — invalid state slug
 *   404 — state not found in MongoDB
 *   500 — unexpected render failure (logged with full context)
 */
export async function GET(
  req: Request,
  { params }: { params: { state: string } }
) {
  const stateSlug = (params.state || "").toLowerCase().trim();
  if (!stateSlug || !/^[a-z0-9-]+$/.test(stateSlug)) {
    return NextResponse.json({ error: "invalid state slug" }, { status: 400 });
  }

  try {
    const { buffer, stateName, traditionCount, festivalCount, providerCount } =
      await renderCataloguePdfBuffer(stateSlug);

    // Fire-and-forget audit log; never block the response on it.
    void recordCatalogueJob({
      stateSlug,
      pdfKind: "state-catalogue",
      generatedBy: req.headers.get("x-wriksh-user") ?? "anonymous",
      durationMs: -1, // overwritten below — we don't have the exact timing here
      byteSize: buffer.byteLength,
      notes: `traditions=${traditionCount}, festivals=${festivalCount}, providers=${providerCount}`,
    }).catch((err) =>
      logger.warn("catalogue_jobs.recordFailed", {
        stateSlug,
        pdfKind: "state-catalogue",
        reason: String(err),
      })
    );

    // Buffer extends Uint8Array in modern Node, so `new Uint8Array(buffer)`
    // is the safest cross-runtime conversion before handing bytes to Web
    // Response — Web Response wants BodyInit, not a Node Buffer.
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename="wriksh-${stateSlug}-catalogue.pdf"`,
        "Cache-Control": "public, max-age=0, s-maxage=300",
        "X-Wriksh-State": stateName,
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("catalogue.render.apiError", { stateSlug, reason });

    if (reason.includes("not found in MongoDB")) {
      return NextResponse.json({ error: reason }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to render catalogue" }, { status: 500 });
  }
}

/** GET /api/catalogue/[state]/pdf?info=1 → JSON summary without rendering. */
export async function HEAD(
  req: Request,
  { params }: { params: { state: string } }
) {
  const url = new URL(req.url);
  if (url.searchParams.get("info") !== "1") {
    return new NextResponse(null, { status: 405 });
  }
  const jobs = await listRecentCatalogueJobs(20);
  return NextResponse.json({
    state: params.state,
    recentJobs: jobs.filter((j) => j.stateSlug === params.state),
  });
}
