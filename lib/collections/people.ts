import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type { PersonDoc, PersonRole } from "@/lib/types";

/**
 * People — the unified contact database.
 *
 * Replaces the old `discover_artists`, `experience_guides`, and
 * `learn_hosts` collections. Every row is a tagged Person; one person
 * can have many roles. Tags are the primary search facet — see the
 * `roles` + `tags` fields on `PersonDoc`.
 */

const COLLECTION = "people";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

type RawDoc = WithId<Omit<PersonDoc, "_id">>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export type PersonListFilter = {
  roles?: PersonRole[];
  q?: string;
  stateSlug?: string;
  tag?: string;
  limit?: number;
};

export async function listPeople(
  filter: PersonListFilter = {}
): Promise<PersonDoc[]> {
  return logger.timed("people.list", filter, async () => {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter.roles && filter.roles.length > 0) q.roles = { $in: filter.roles };
    if (filter.stateSlug) q.stateSlug = filter.stateSlug;
    if (filter.tag) q.tags = filter.tag;
    if (filter.q) {
      const r = filter.q;
      q.$or = [
        { name: { $regex: r, $options: "i" } },
        { slug: { $regex: r, $options: "i" } },
        { tags: { $regex: r, $options: "i" } },
        { "contact.email": { $regex: r, $options: "i" } },
        { "contact.phone": { $regex: r, $options: "i" } },
        { city: { $regex: r, $options: "i" } },
        { bio: { $regex: r, $options: "i" } },
        { artForms: { $regex: r, $options: "i" } },
        { languages: { $regex: r, $options: "i" } },
        { hostType: { $regex: r, $options: "i" } },
      ];
    }
    const docs = await db
      .collection<RawDoc>(COLLECTION)
      .find(q)
      .sort({ name: 1 })
      .limit(Math.min(500, filter.limit ?? 200))
      .toArray();
    return docs as unknown as PersonDoc[];
  });
}

export async function getPersonBySlug(slug: string): Promise<PersonDoc | undefined> {
  return logger.timed("people.get", { slug }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<RawDoc>(COLLECTION)
      .findOne({ slug }, { projection: undefined });
    return (doc as unknown as PersonDoc) ?? undefined;
  });
}

export async function getPersonById(id: string): Promise<PersonDoc | undefined> {
  return logger.timed("people.getById", { id }, async () => {
    const db = await getDb();
    const doc = await db
      .collection<RawDoc>(COLLECTION)
      .findOne({ _id: toObjectId(id) });
    return (doc as unknown as PersonDoc) ?? undefined;
  });
}

export async function countPeople(): Promise<number> {
  return logger.timed("people.count", {}, async () => {
    const db = await getDb();
    return db.collection<PersonDoc>(COLLECTION).countDocuments({});
  });
}

/** Counts by role — powers the dashboard tiles + /people header. */
export async function countPeopleByRole(): Promise<Record<PersonRole, number>> {
  return logger.timed("people.countByRole", {}, async () => {
    const db = await getDb();
    const pipeline = [{ $unwind: "$roles" }, { $group: { _id: "$roles", n: { $sum: 1 } } }];
    const out: Record<PersonRole, number> = {
      artist: 0,
      guide: 0,
      host: 0,
      government: 0,
      vendor: 0,
      team: 0,
    };
    for (const row of await db.collection(COLLECTION).aggregate(pipeline).toArray()) {
      if (row._id in out) out[row._id as PersonRole] = row.n as number;
    }
    return out;
  });
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createPerson(
  input: Omit<PersonDoc, "_id">
): Promise<PersonDoc> {
  return logger.timed("people.create", { slug: input.slug }, async () => {
    if (!input.slug) input.slug = slugify(input.name);
    if (!input.slug) throw new Error("slug is required (or pass a name)");
    if (!input.roles?.length) throw new Error("at least one role is required");
    const db = await getDb();
    const doc: PersonDoc = {
      ...input,
      tags: input.tags ?? [],
      contact: input.contact ?? {},
      status: input.status ?? "published",
      updatedAt: new Date().toISOString(),
    };
    await db.collection<PersonDoc>(COLLECTION).insertOne(doc);
    return doc;
  });
}

export async function updatePerson(
  slug: string,
  patch: Partial<Omit<PersonDoc, "slug">>
): Promise<PersonDoc | null> {
  return logger.timed("people.update", { slug }, async () => {
    const db = await getDb();
    const next = { ...patch, updatedAt: new Date().toISOString() };
    const result = await db
      .collection<RawDoc>(COLLECTION)
      .findOneAndUpdate(
        { slug },
        { $set: next as Partial<Omit<PersonDoc, "_id">> },
        { returnDocument: "after" }
      );
    return (result as unknown as PersonDoc) ?? null;
  });
}

export async function deletePerson(slug: string): Promise<boolean> {
  return logger.timed("people.delete", { slug }, async () => {
    const db = await getDb();
    const res = await db.collection<PersonDoc>(COLLECTION).deleteOne({ slug });
    return res.deletedCount > 0;
  });
}

// ---------------------------------------------------------------------------
// Migration helper — one-shot, called by `scripts/migrate_people.ts`.
// ---------------------------------------------------------------------------

export type LegacySource = "discover_artists" | "experience_guides" | "learn_hosts";

export type LegacyDoc = {
  slug: string;
  name: string;
  stateSlug?: string;
  city?: string;
  bio?: string;
  contact?: PersonDoc["contact"];
  status?: string;
  updatedAt?: string;
  artForms?: string[];
  cityHint?: string;
  pastPerformances?: unknown;
  priceRange?: { min: number; max: number; currency?: "INR" };
  quotations?: unknown;
  ratings?: unknown;
  languages?: string[];
  experiences?: string[];
  certifications?: string[];
  rating?: number;
  type?: "ttc" | "csr" | "apprenticeship" | "workshop";
  artForm?: string;
  duration?: string;
  feeINR?: number;
  description?: string;
  prerequisites?: string;
};

/**
 * Derive `roles[]` and `tags[]` for a legacy doc being merged into People.
 *
 * Pure function — exported for testability.
 */
export function derivePersonFromLegacy(
  source: LegacySource,
  legacy: LegacyDoc
): Omit<PersonDoc, "_id"> {
  const roles: PersonRole[] = [];
  const tags: string[] = [];
  if (source === "discover_artists") roles.push("artist");
  if (source === "experience_guides") roles.push("guide");
  if (source === "learn_hosts") roles.push("host");
  if (legacy.stateSlug) tags.push(legacy.stateSlug);
  if (legacy.artForms) tags.push(...legacy.artForms);
  if (legacy.artForm) tags.push(legacy.artForm);
  if (legacy.languages) tags.push(...legacy.languages);

  return {
    slug: legacy.slug,
    name: legacy.name,
    roles,
    tags: Array.from(new Set(tags)),
    stateSlug: legacy.stateSlug,
    city: legacy.city,
    bio: legacy.bio,
    contact: legacy.contact ?? {},
    status: (legacy.status as PersonDoc["status"]) ?? "published",
    source: "manual",
    // Role-specific pass-through
    artForms: legacy.artForms,
    pastPerformances: legacy.pastPerformances as PersonDoc["pastPerformances"],
    quotations: legacy.quotations as PersonDoc["quotations"],
    ratings: legacy.ratings as PersonDoc["ratings"],
    priceRange: legacy.priceRange,
    languages: legacy.languages,
    certifications: legacy.certifications,
    rating: legacy.rating,
    hostType: legacy.type,
    duration: legacy.duration,
    feeINR: legacy.feeINR,
    description: legacy.description,
    prerequisites: legacy.prerequisites,
    updatedAt: legacy.updatedAt ?? new Date().toISOString(),
  };
}
