import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type {
  DiscordChannelDoc,
  MarketingCategory,
  ContentStatus,
} from "@/lib/types";
import { MARKETING_CATEGORY_LABELS } from "@/lib/types";

/**
 * CRUD for the `discord_channels` collection.
 *
 * Each row maps one Discord channel to one webhook URL plus a set of
 * marketing categories the channel wants to be notified about. The
 * daily-cron reads this list and posts the digest to every channel whose
 * `notifyCategories` overlaps with today's categories.
 *
 * Webhook URLs are stored verbatim — they're effectively bearer tokens.
 * Anyone with shell access to the Mongo cluster can already read everything
 * else, so storing them in plain text is acceptable here. The admin UI
 * masks them on display.
 */

const COLLECTION = "discord_channels";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listDiscordChannels(): Promise<DiscordChannelDoc[]> {
  return logger.timed("discord_channels.list", {}, async () => {
    const db = await getDb();
    const docs = await db
      .collection<DiscordChannelDoc>(COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();
    return docs;
  });
}

export async function getDiscordChannel(slug: string): Promise<DiscordChannelDoc | undefined> {
  return logger.timed("discord_channels.get", { slug }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<DiscordChannelDoc>(COLLECTION)
      .findOne({ slug }, { projection: { _id: 0 } });
    return doc ?? undefined;
  });
}

export async function createDiscordChannel(
  input: Omit<DiscordChannelDoc, "slug"> & { slug?: string }
): Promise<DiscordChannelDoc> {
  return logger.timed("discord_channels.create", { name: input.name }, async () => {
    if (!input.webhookUrl || !/^https:\/\//.test(input.webhookUrl)) {
      throw new Error("webhookUrl must be an https:// URL");
    }
    const db = await getDb();
    const baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    let slug = baseSlug || "channel";
    let n = 2;
    while (await db.collection<DiscordChannelDoc>(COLLECTION).findOne({ slug })) {
      slug = `${baseSlug}-${n}`;
      n += 1;
    }
    const doc: DiscordChannelDoc = {
      slug,
      name: input.name,
      channelId: input.channelId,
      guildId: input.guildId,
      purpose: input.purpose,
      webhookUrl: input.webhookUrl,
      notifyCategories: input.notifyCategories,
      status: input.status ?? ("published" as ContentStatus),
    };
    await db.collection<DiscordChannelDoc>(COLLECTION).insertOne(doc);
    return doc;
  });
}

export async function updateDiscordChannel(
  slug: string,
  input: Partial<Omit<DiscordChannelDoc, "slug">>
): Promise<DiscordChannelDoc | null> {
  return logger.timed("discord_channels.update", { slug }, async () => {
    if (input.webhookUrl !== undefined && !/^https:\/\//.test(input.webhookUrl)) {
      throw new Error("webhookUrl must be an https:// URL");
    }
    const db = await getDb();
    const patch: Partial<DiscordChannelDoc> = { ...input };
    const result = await db
      .collection<DiscordChannelDoc>(COLLECTION)
      .findOneAndUpdate(
        { slug },
        { $set: patch },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as DiscordChannelDoc) ?? null;
  });
}

export async function deleteDiscordChannel(slug: string): Promise<boolean> {
  return logger.timed("discord_channels.delete", { slug }, async () => {
    const db = await getDb();
    const res = await db.collection<DiscordChannelDoc>(COLLECTION).deleteOne({ slug });
    return res.deletedCount > 0;
  });
}

export async function recordChannelPost(
  slug: string,
  ok: boolean,
  durationMs: number,
  notes?: string
): Promise<void> {
  return logger.timed(
    "discord_channels.recordPost",
    { slug, ok },
    async () => {
      const db = await getDb();
      await db.collection<DiscordChannelDoc>(COLLECTION).updateOne(
        { slug },
        {
          $set: {
            lastPostedAt: new Date().toISOString(),
            lastPostOk: ok,
            lastPostDurationMs: durationMs,
            lastPostNotes: notes ?? null,
          },
        }
      );
    }
  );
}

// ---------------------------------------------------------------------------
// Channel-shape helpers used by the admin UI
// ---------------------------------------------------------------------------

/** All known categories — exported so the UI can render a checkbox per one. */
export const ALL_CATEGORIES: MarketingCategory[] = Object.keys(
  MARKETING_CATEGORY_LABELS
) as MarketingCategory[];

/**
 * Mask a webhook URL for display: show first 30 chars + last 4 + the host.
 * Keeps operators confident the URL is real while hiding the secret token.
 */
export function maskWebhookUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const head = path.slice(0, 18);
    const tail = path.slice(-4);
    return `${u.protocol}//${u.host}${head}…${tail}`;
  } catch {
    return "(invalid url)";
  }
}
