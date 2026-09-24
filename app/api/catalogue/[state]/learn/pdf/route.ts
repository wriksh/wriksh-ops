import { NextResponse } from "next/server";
import { renderLearnPdfBuffer } from "@/lib/catalogue/render";
import { recordCatalogueJob } from "@/lib/collections/catalogue";
import { logger } from "@/lib/logger";

/**
 * GET /api/catalogue/[state]/learn/pdf
 *
 * Renders the learn PDF for a state — a list of every published learn
 * program in {state}, with real cover images, lead-teacher profile,
 * cohort intake dates, prerequisites, and cancellation policy.
 *
 * Audit-logged under `catalogue_jobs` with `pdfKind = "learn"` so the
 * per-tab render-history tables can filter cleanly.
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
    const { buffer, stateName, learnCount } =
      await renderLearnPdfBuffer(stateSlug);

    void recordCatalogueJob({
      stateSlug,
      pdfKind: "learn",
      generatedBy: req.headers.get("x-wriksh-user") ?? "anonymous",
      durationMs: -1,
      byteSize: buffer.byteLength,
      notes: `learn=${learnCount}`,
    }).catch((err) =>
      logger.warn("catalogue_jobs.recordFailed", {
        stateSlug,
        pdfKind: "learn",
        reason: String(err),
      })
    );

    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename="wriksh-${stateSlug}-learn.pdf"`,
        "Cache-Control": "public, max-age=0, s-maxage=300",
        "X-Wriksh-State": stateName,
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("catalogue.learn.render.apiError", { stateSlug, reason });

    if (reason.includes("not found in MongoDB")) {
      return NextResponse.json({ error: reason }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to render learn PDF" },
      { status: 500 }
    );
  }
}
