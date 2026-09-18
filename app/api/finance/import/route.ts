import { NextResponse } from "next/server";
import { importFinanceCsv } from "@/lib/collections/finance";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body.csv !== "string" || body.csv.length === 0) {
      return NextResponse.json({ error: "csv field required" }, { status: 400 });
    }
    const result = await importFinanceCsv(body.csv);
    logger.info("finance.csvImport", result);
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
