import { NextResponse } from "next/server";
import {
  listDiscordChannels,
  createDiscordChannel,
} from "@/lib/collections/discord";
import { logger } from "@/lib/logger";

/**
 * GET /api/discord/channels        → list channels (webhook URLs masked)
 * POST /api/discord/channels       → create a new channel
 */
export async function GET() {
  const docs = await listDiscordChannels();
  return NextResponse.json({ channels: docs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const doc = await createDiscordChannel({
      name: body.name,
      channelId: body.channelId,
      guildId: body.guildId,
      purpose: body.purpose ?? "",
      webhookUrl: body.webhookUrl,
      notifyCategories: body.notifyCategories ?? [],
      status: body.status,
    });
    logger.info("discord_channels.api.created", { slug: doc.slug });
    return NextResponse.json({ channel: doc }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
