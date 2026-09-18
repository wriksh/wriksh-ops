import { NextResponse } from "next/server";
import {
  getMarketingEventById,
  updateMarketingEvent,
  deleteMarketingEvent,
} from "@/lib/collections/marketing";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const e = await getMarketingEventById(params.id);
  if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ event: e });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const e = await updateMarketingEvent(params.id, body);
    if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ event: e });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteMarketingEvent(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
