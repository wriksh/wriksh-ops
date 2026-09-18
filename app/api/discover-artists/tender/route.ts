import { NextResponse } from "next/server";
import { listTenders, createTender } from "@/lib/collections/artists";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "open" | "submitted" | "won" | "lost" | "cancelled" | null;
  const stateSlug = url.searchParams.get("stateSlug") ?? undefined;
  const tenders = await listTenders({ status: status ?? undefined, stateSlug });
  return NextResponse.json({ tenders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const t = await createTender(body);
    return NextResponse.json({ tender: t }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
