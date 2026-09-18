import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type { ExperienceGuideDoc, LearnHostDoc } from "@/lib/types";

/**
 * Phase 6 — Experience guides + Learn hosts.
 *
 * Combined module because the collections are tiny CRUD surfaces and the
 * admin UIs are very similar.
 */

const GUIDES = "experience_guides";
const HOSTS = "learn_hosts";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

type RawGuide = WithId<Omit<ExperienceGuideDoc, "_id">>;
type RawHost = WithId<Omit<LearnHostDoc, "_id">>;

// ---------------------------------------------------------------------------
// Experience guides
// ---------------------------------------------------------------------------

export async function listExperienceGuides(filter?: {
  stateSlug?: string;
}): Promise<ExperienceGuideDoc[]> {
  return logger.timed("experience_guides.list", filter ?? {}, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter?.stateSlug) q.stateSlug = filter.stateSlug;
    const docs = await db
      .collection<RawGuide>(GUIDES)
      .find(q, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .limit(500)
      .toArray();
    return docs as unknown as ExperienceGuideDoc[];
  });
}

export async function countExperienceGuides(): Promise<number> {
  return logger.timed("experience_guides.count", {}, async () => {
    const db = await getDb();
    return db.collection<ExperienceGuideDoc>(GUIDES).countDocuments({});
  });
}

export async function createExperienceGuide(
  input: Omit<ExperienceGuideDoc, "_id">
): Promise<ExperienceGuideDoc> {
  return logger.timed("experience_guides.create", { slug: input.slug }, async () => {
    if (!input.slug) throw new Error("slug is required");
    const db = await getDb();
    const doc: ExperienceGuideDoc = { ...input, status: input.status ?? "published" };
    await db.collection<ExperienceGuideDoc>(GUIDES).insertOne(doc);
    return doc;
  });
}

export async function updateExperienceGuide(
  slug: string,
  patch: Partial<Omit<ExperienceGuideDoc, "slug">>
): Promise<ExperienceGuideDoc | null> {
  return logger.timed("experience_guides.update", { slug }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawGuide>(GUIDES)
      .findOneAndUpdate(
        { slug },
        { $set: patch as Partial<Omit<ExperienceGuideDoc, "_id">> },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as ExperienceGuideDoc) ?? null;
  });
}

export async function deleteExperienceGuide(slug: string): Promise<boolean> {
  return logger.timed("experience_guides.delete", { slug }, async () => {
    const db = await getDb();
    const res = await db.collection<ExperienceGuideDoc>(GUIDES).deleteOne({ slug });
    return res.deletedCount > 0;
  });
}

// ---------------------------------------------------------------------------
// Learn hosts
// ---------------------------------------------------------------------------

export async function listLearnHosts(filter?: {
  type?: LearnHostDoc["type"];
  stateSlug?: string;
}): Promise<LearnHostDoc[]> {
  return logger.timed("learn_hosts.list", filter ?? {}, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter?.type) q.type = filter.type;
    if (filter?.stateSlug) q.stateSlug = filter.stateSlug;
    const docs = await db
      .collection<RawHost>(HOSTS)
      .find(q, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .limit(500)
      .toArray();
    return docs as unknown as LearnHostDoc[];
  });
}

export async function countLearnHosts(): Promise<number> {
  return logger.timed("learn_hosts.count", {}, async () => {
    const db = await getDb();
    return db.collection<LearnHostDoc>(HOSTS).countDocuments({});
  });
}

export async function createLearnHost(
  input: Omit<LearnHostDoc, "_id">
): Promise<LearnHostDoc> {
  return logger.timed("learn_hosts.create", { slug: input.slug }, async () => {
    if (!input.slug) throw new Error("slug is required");
    const db = await getDb();
    const doc: LearnHostDoc = { ...input, status: input.status ?? "published" };
    await db.collection<LearnHostDoc>(HOSTS).insertOne(doc);
    return doc;
  });
}

export async function updateLearnHost(
  slug: string,
  patch: Partial<Omit<LearnHostDoc, "slug">>
): Promise<LearnHostDoc | null> {
  return logger.timed("learn_hosts.update", { slug }, async () => {
    const db = await getDb();
    const result = await db
      .collection<RawHost>(HOSTS)
      .findOneAndUpdate(
        { slug },
        { $set: patch as Partial<Omit<LearnHostDoc, "_id">> },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as LearnHostDoc) ?? null;
  });
}

export async function deleteLearnHost(slug: string): Promise<boolean> {
  return logger.timed("learn_hosts.delete", { slug }, async () => {
    const db = await getDb();
    const res = await db.collection<LearnHostDoc>(HOSTS).deleteOne({ slug });
    return res.deletedCount > 0;
  });
}
