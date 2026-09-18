import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * Singleton Mongo client.
 *
 * This file is intentionally a near-verbatim mirror of
 * `wriksh-dev/lib/mongodb.ts` so the two Next apps share connection
 * semantics: one client per process, hot-reload safe in dev, and a
 * cached promise across warm serverless invocations in production.
 *
 * Database name comes from `MONGODB_DB` (defaults to "wriksh" — same
 * cluster as the customer-facing wriksh-dev app).
 */
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "wriksh";

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (and to your Vercel project's environment variables)."
    );
  }

  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = new MongoClient(uri).connect();
    }
    return globalWithMongo._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

/** The canonical list of collection names used by wriksh-ops. */
export const COLLECTIONS = {
  states: "states",
  providers: "providers",
  traditions: "traditions",
  festivals: "festivals",
  experiences: "experiences",
  learn: "learn",
  pages: "pages",
  gallery: "gallery",
  redirects: "redirects",
  intents: "intents",
  categories: "categories",
  stories: "stories",
  bookings: "bookings",
  payments: "payments",
  users: "users",
  // ---- New collections owned by wriksh-ops ----
  catalogueOverrides: "catalogue_overrides",
  catalogueJobs: "catalogue_jobs",
  marketingEvents: "marketing_events",
  discordChannels: "discord_channels",
  financeTransactions: "finance_transactions",
  discoverArtists: "discover_artists",
  experienceGuides: "experience_guides",
  learnHosts: "learn_hosts",
  mediaAssets: "media_assets",
  tenders: "tenders",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
