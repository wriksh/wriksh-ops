import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type {
  MarketingEventDoc,
  MarketingCategory,
} from "@/lib/types";

/**
 * The Mongo `_id` is an ObjectId on the wire, but our TS type is `string`
 * (so it round-trips cleanly through JSON). Convert at the boundary.
 */
function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

/** What we get back from Mongo before projecting out `_id`. */
type RawDoc = WithId<Omit<MarketingEventDoc, "_id">>;

/**
 * Marketing calendar — Phase 2 module.
 *
 * Powers three things:
 *   1. The admin UI at `/marketing` (CRUD on marketing_events).
 *   2. The Discord daily digest (loaded via `listTodayMarketingEvents` in
 *      `lib/discord/today.ts`).
 *   3. The Dhoomkethu dashboard tile (counts per category).
 */

const COLLECTION = "marketing_events";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listRecentMarketingEvents(limit = 50): Promise<MarketingEventDoc[]> {
  return logger.timed("marketing_events.list", { limit }, async () => {
    const db = await getDb();
    const docs = await db
      .collection<RawDoc>(COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    return docs as unknown as MarketingEventDoc[];
  });
}

export async function listEventsInRange(
  startYmd: string,
  endYmd: string
): Promise<MarketingEventDoc[]> {
  return logger.timed(
    "marketing_events.listInRange",
    { startYmd, endYmd },
    async () => {
      const db = await getDb();
      const docs = await db
        .collection<RawDoc>(COLLECTION)
        .find(
          {
            $or: [
              { date: { $gte: startYmd, $lt: endYmd } },
              { endDate: { $gte: startYmd }, date: { $lte: endYmd } },
            ],
          },
          { projection: { _id: 0 } }
        )
        .sort({ date: 1 })
        .toArray();
      return docs as unknown as MarketingEventDoc[];
    }
  );
}

export async function countMarketingEventsByCategory(): Promise<Record<MarketingCategory, number>> {
  return logger.timed("marketing_events.countByCategory", {}, async () => {
    const db = await getDb();
    const pipeline = [{ $group: { _id: "$category", n: { $sum: 1 } } }];
    const out: Record<MarketingCategory, number> = {
      post: 0,
      meeting: 0,
      experience: 0,
      collab: 0,
      ad: 0,
      "app-dev": 0,
    };
    for (const row of await db.collection(COLLECTION).aggregate(pipeline).toArray()) {
      if (row._id in out) {
        out[row._id as MarketingCategory] = row.n as number;
      }
    }
    return out;
  });
}

export async function getMarketingEventById(id: string): Promise<MarketingEventDoc | undefined> {
  return logger.timed("marketing_events.get", { id }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<RawDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) }, { projection: { _id: 0 } });
    return (doc as unknown as MarketingEventDoc) ?? undefined;
  });
}

export async function createMarketingEvent(
  input: Omit<MarketingEventDoc, "_id" | "createdAt" | "updatedAt">
): Promise<MarketingEventDoc> {
  return logger.timed(
    "marketing_events.create",
    { title: input.title, category: input.category },
    async () => {
      const now = new Date().toISOString();
      const doc: Omit<MarketingEventDoc, "_id"> = {
        ...input,
        status: input.status ?? "planned",
        createdAt: now,
        updatedAt: now,
      };
      const db = await getDb();
      const res = await db
        .collection<Omit<MarketingEventDoc, "_id">>(COLLECTION)
        .insertOne(doc);
      return { ...doc, _id: String(res.insertedId) };
    }
  );
}

export async function updateMarketingEvent(
  id: string,
  patch: Partial<Omit<MarketingEventDoc, "_id" | "createdAt">>
): Promise<MarketingEventDoc | null> {
  return logger.timed("marketing_events.update", { id }, async () => {
    const db = await getDb();
    const next = { ...patch, updatedAt: new Date().toISOString() };
    const result = await db
      .collection<RawDoc>(COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(id) },
        { $set: next },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as MarketingEventDoc) ?? null;
  });
}

export async function deleteMarketingEvent(id: string): Promise<boolean> {
  return logger.timed("marketing_events.delete", { id }, async () => {
    const db = await getDb();
    const res = await db
      .collection<RawDoc>(COLLECTION)
      .deleteOne({ _id: toObjectId(id) });
    return res.deletedCount > 0;
  });
}

export const ALL_CATEGORIES: MarketingCategory[] = [
  "post",
  "meeting",
  "experience",
  "collab",
  "ad",
  "app-dev",
];

export const EVENT_STATUSES: NonNullable<MarketingEventDoc["status"]>[] = [
  "planned",
  "live",
  "done",
  "cancelled",
];

export function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export { slugify };
