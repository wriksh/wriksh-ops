import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type { MediaAssetDoc } from "@/lib/types";

/**
 * Media assets — Phase 7.
 *
 * Stores metadata about every photo / video / doc / audio file the team
 * uses. Files themselves live in Vercel Blob (the existing `BLOB_*`
 * env vars are already configured for the customer app).
 */

const COLLECTION = "media_assets";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

type RawDoc = WithId<Omit<MediaAssetDoc, "_id">>;

export async function listMediaAssets(filter?: {
  kind?: MediaAssetDoc["kind"];
  bucket?: string;
  q?: string;
}): Promise<MediaAssetDoc[]> {
  return logger.timed("media_assets.list", filter ?? {}, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter?.kind) q.kind = filter.kind;
    if (filter?.bucket) q.bucket = filter.bucket;
    if (filter?.q) {
      q.$or = [
        { title: { $regex: filter.q, $options: "i" } },
        { tags: { $regex: filter.q, $options: "i" } },
        { caption: { $regex: filter.q, $options: "i" } },
      ];
    }
    // Keep `_id` so callers can reference it (Library index, detail pages).
    const docs = await db
      .collection<RawDoc>(COLLECTION)
      .find(q)
      .sort({ uploadedAt: -1 })
      .limit(500)
      .toArray();
    return docs as unknown as MediaAssetDoc[];
  });
}

export async function countMediaAssets(): Promise<number> {
  return logger.timed("media_assets.count", {}, async () => {
    const db = await getDb();
    return db.collection<MediaAssetDoc>(COLLECTION).countDocuments({});
  });
}

export async function createMediaAsset(
  input: Omit<MediaAssetDoc, "_id">
): Promise<MediaAssetDoc> {
  return logger.timed("media_assets.create", { title: input.title }, async () => {
    if (!input.url) throw new Error("url is required");
    if (!input.title) throw new Error("title is required");
    const db = await getDb();
    const doc: MediaAssetDoc = { ...input, uploadedAt: input.uploadedAt ?? new Date().toISOString() };
    await db.collection<MediaAssetDoc>(COLLECTION).insertOne(doc);
    return doc;
  });
}

export async function updateMediaAsset(
  id: string,
  patch: Partial<MediaAssetDoc>
): Promise<MediaAssetDoc | null> {
  return logger.timed("media_assets.update", { id }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawDoc>(COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(id) },
        { $set: patch as Partial<Omit<MediaAssetDoc, "_id">> },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as MediaAssetDoc) ?? null;
  });
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  return logger.timed("media_assets.delete", { id }, async () => {
    const db = await getDb();
    const res = await db
      .collection<RawDoc>(COLLECTION)
      .deleteOne({ _id: toObjectId(id) });
    return res.deletedCount > 0;
  });
}

export async function listBuckets(): Promise<string[]> {
  return logger.timed("media_assets.listBuckets", {}, async () => {
    const db = await getDb();
    const docs = await db
      .collection<MediaAssetDoc>(COLLECTION)
      .distinct("bucket");
    return docs.filter((b): b is string => typeof b === "string" && b.length > 0);
  });
}
