import { NextResponse } from "next/server";
import {
  listRecentMarketingEvents,
  createMarketingEvent,
} from "@/lib/collections/marketing";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const events = await listRecentMarketingEvents(Math.min(200, Math.max(1, limit)));
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.category || !body.date) {
      return NextResponse.json(
        { error: "title, category, date are required" },
        { status: 400 }
      );
    }
    const event = await createMarketingEvent({
      title: String(body.title),
      category: body.category,
      date: String(body.date),
      endDate: body.endDate ? String(body.endDate) : undefined,
      owner: body.owner ? String(body.owner) : undefined,
      channel: body.channel ? String(body.channel) : undefined,
      status: body.status,
      notes: body.notes ? String(body.notes) : undefined,
      links: body.links,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
