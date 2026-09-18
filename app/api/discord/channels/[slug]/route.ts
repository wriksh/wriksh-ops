import { NextResponse } from "next/server";
import {
  getDiscordChannel,
  updateDiscordChannel,
  deleteDiscordChannel,
} from "@/lib/collections/discord";

/**
 * GET    /api/discord/channels/[slug] → fetch one
 * PATCH  /api/discord/channels/[slug] → partial update
 * DELETE /api/discord/channels/[slug] → remove
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const doc = await getDiscordChannel(params.slug);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ channel: doc });
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const doc = await updateDiscordChannel(params.slug, body);
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ channel: doc });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const ok = await deleteDiscordChannel(params.slug);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
