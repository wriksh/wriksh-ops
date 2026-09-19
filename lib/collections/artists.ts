import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type {
  DiscoverArtistDoc,
  ArtistQuotationDoc,
  ArtistRatingDoc,
  TenderDoc,
} from "@/lib/types";

/**
 * Discover Artists + Tenders — Phase 5 module.
 *
 * CRUD for verified vendor records (quotations, ratings, location, art
 * forms) and for government / institutional tender opportunities.
 *
 * The matching algorithm itself lives in `lib/matching/score.ts` so it
 * can be unit-tested in isolation.
 */

const ARTISTS = "discover_artists";
const TENDERS = "tenders";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

type RawArtist = WithId<Omit<DiscoverArtistDoc, "_id">>;
type RawTender = WithId<Omit<TenderDoc, "_id">>;

// ---------------------------------------------------------------------------
// Artists — read
// ---------------------------------------------------------------------------

export async function listDiscoverArtists(filter?: {
  stateSlug?: string;
  q?: string;
}): Promise<DiscoverArtistDoc[]> {
  return logger.timed("discover_artists.list", filter ?? {}, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter?.stateSlug) q.stateSlug = filter.stateSlug;
    if (filter?.q) {
      q.$or = [
        { name: { $regex: filter.q, $options: "i" } },
        { artForms: { $regex: filter.q, $options: "i" } },
        { city: { $regex: filter.q, $options: "i" } },
      ];
    }
    const docs = await db
      .collection<RawArtist>(ARTISTS)
      .find(q, { projection: { _id: 0 } })
      .limit(500)
      .toArray();
    return docs as unknown as DiscoverArtistDoc[];
  });
}

export async function getDiscoverArtist(slug: string): Promise<DiscoverArtistDoc | undefined> {
  return logger.timed("discover_artists.get", { slug }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<RawArtist>(ARTISTS)
      .findOne({ slug }, { projection: { _id: 0 } });
    return (doc as unknown as DiscoverArtistDoc) ?? undefined;
  });
}

export async function countArtists(): Promise<number> {
  return logger.timed("discover_artists.count", {}, async () => {
    const db = await getDb();
    return db.collection<DiscoverArtistDoc>(ARTISTS).countDocuments({});
  });
}

// ---------------------------------------------------------------------------
// Artists — CRUD
// ---------------------------------------------------------------------------

export async function createDiscoverArtist(
  input: Omit<DiscoverArtistDoc, "_id">
): Promise<DiscoverArtistDoc> {
  return logger.timed("discover_artists.create", { slug: input.slug }, async () => {
    if (!input.slug) throw new Error("slug is required");
    const db = await getDb();
    const doc: DiscoverArtistDoc = {
      ...input,
      quotations: input.quotations ?? [],
      ratings: input.ratings ?? [],
      updatedAt: new Date().toISOString(),
    };
    await db.collection<DiscoverArtistDoc>(ARTISTS).insertOne(doc);
    return doc;
  });
}

export async function updateDiscoverArtist(
  slug: string,
  patch: Partial<Omit<DiscoverArtistDoc, "slug">>
): Promise<DiscoverArtistDoc | null> {
  return logger.timed("discover_artists.update", { slug }, async () => {
    const db = await getDb();
    const next = { ...patch, updatedAt: new Date().toISOString() };
    const result = await db
      .collection<RawArtist>(ARTISTS)
      .findOneAndUpdate(
        { slug },
        { $set: next as Partial<Omit<DiscoverArtistDoc, "_id">> },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as DiscoverArtistDoc) ?? null;
  });
}

export async function deleteDiscoverArtist(slug: string): Promise<boolean> {
  return logger.timed("discover_artists.delete", { slug }, async () => {
    const db = await getDb();
    const res = await db.collection<DiscoverArtistDoc>(ARTISTS).deleteOne({ slug });
    return res.deletedCount > 0;
  });
}

/** Append a quotation to an artist — used by the ops intake form. */
export async function addArtistQuotation(
  slug: string,
  q: ArtistQuotationDoc
): Promise<DiscoverArtistDoc | null> {
  return logger.timed("discover_artists.addQuotation", { slug }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawArtist>(ARTISTS)
      .findOneAndUpdate(
        { slug },
        { $push: { quotations: q }, $set: { updatedAt: new Date().toISOString() } },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as DiscoverArtistDoc) ?? null;
  });
}

/** Append a rating — used after every booking. */
export async function addArtistRating(
  slug: string,
  r: ArtistRatingDoc
): Promise<DiscoverArtistDoc | null> {
  return logger.timed("discover_artists.addRating", { slug }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawArtist>(ARTISTS)
      .findOneAndUpdate(
        { slug },
        { $push: { ratings: r }, $set: { updatedAt: new Date().toISOString() } },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as DiscoverArtistDoc) ?? null;
  });
}

// ---------------------------------------------------------------------------
// Tenders
// ---------------------------------------------------------------------------

export async function listTenders(filter?: {
  status?: TenderDoc["status"];
  stateSlug?: string;
}): Promise<TenderDoc[]> {
  return logger.timed("tenders.list", filter ?? {}, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.stateSlug) q.stateSlug = filter.stateSlug;
    const docs = await db
      .collection<RawTender>(TENDERS)
      .find(q, { projection: { _id: 0 } })
      .sort({ deadline: 1 })
      .limit(200)
      .toArray();
    return docs as unknown as TenderDoc[];
  });
}

export async function getTenderByReference(ref: string): Promise<TenderDoc | undefined> {
  return logger.timed("tenders.get", { ref }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<RawTender>(TENDERS)
      .findOne({ referenceId: ref }, { projection: { _id: 0 } });
    return (doc as unknown as TenderDoc) ?? undefined;
  });
}

export async function countTenders(): Promise<{ total: number; open: number }> {
  return logger.timed("tenders.count", {}, async () => {
    const db = await getDb();
    const [total, open] = await Promise.all([
      db.collection<TenderDoc>(TENDERS).countDocuments({}),
      db.collection<TenderDoc>(TENDERS).countDocuments({ status: "open" }),
    ]);
    return { total, open };
  });
}

export async function createTender(input: Omit<TenderDoc, "_id">): Promise<TenderDoc> {
  return logger.timed("tenders.create", { ref: input.referenceId }, async () => {
    if (!input.referenceId) throw new Error("referenceId is required");
    const db = await getDb();
    const doc: TenderDoc = { ...input, status: input.status ?? "open" };
    await db.collection<TenderDoc>(TENDERS).insertOne(doc);
    return doc;
  });
}

export async function updateTender(
  ref: string,
  patch: Partial<TenderDoc>
): Promise<TenderDoc | null> {
  return logger.timed("tenders.update", { ref }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawTender>(TENDERS)
      .findOneAndUpdate(
        { referenceId: ref },
        { $set: patch as Partial<Omit<TenderDoc, "_id">> },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as TenderDoc) ?? null;
  });
}

export async function deleteTender(ref: string): Promise<boolean> {
  return logger.timed("tenders.delete", { ref }, async () => {
    const db = await getDb();
    const res = await db.collection<TenderDoc>(TENDERS).deleteOne({ referenceId: ref });
    return res.deletedCount > 0;
  });
}
