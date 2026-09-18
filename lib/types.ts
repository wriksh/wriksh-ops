/**
 * Type definitions for wriksh-ops.
 *
 * Two groups:
 *   1. **Mirror types** — collections owned by the customer-facing wriksh-dev
 *      app (states, providers, traditions, festivals). We only declare the
 *      fields we actually read here, so drift is limited.
 *   2. **Ops types** — new collections owned by wriksh-ops (catalogue
 *      overrides, marketing events, finance, artists, etc.).
 */

export type ContentStatus = "draft" | "published";

// ---------------------------------------------------------------------------
// 1. Mirror types — wriksh-dev collections (read-only in this app)
// ---------------------------------------------------------------------------

export type StateDoc = {
  slug: string;
  name: string;
  nameLocal?: string;
  region: string;
  tagline: string;
  heroTheme: string;
  story: string[];
  categoryIds: string[];
  highlights: string[];
  isUnionTerritory?: boolean;
  coverImage?: string;
  dance?: string[];
  music?: string[];
  theatreAndPuppetry?: string[];
  artCraft?: string[];
  martialArts?: string[];
  experienceIdeas?: string[];
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
};

export type ProviderDoc = {
  slug: string;
  name: string;
  role: string;
  craft: string;
  stateSlug: string;
  experienceLabel: string;
  bio: string;
  signature: string;
  verifiedNote: string;
  coverImage?: string;
  headerImage?: string;
  gallery?: string[];
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
};

export type TraditionDoc = {
  slug: string;
  name: string;
  nameLocal?: string;
  kind: string;
  description: string;
  history?: string;
  howPracticed?: string;
  heroTheme: string;
  stateSlug: string;
  coverImage?: string;
  sliderImages?: string[];
  sliderCaptions?: string[];
  relatedFestivalSlugs?: string[];
  relatedExperienceSlugs?: string[];
  relatedLearnSlugs?: string[];
  status?: ContentStatus;
};

export type FestivalDoc = {
  slug: string;
  name: string;
  nameLocal?: string;
  stateSlugs: string[];
  description: string;
  month: string;
  startDate?: string;
  endDate?: string;
  category: string;
  categoryLabel: string;
  heroTheme: string;
  coverImage?: string;
  relatedCraft?: string[];
  relatedDance?: string[];
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
};

// ---------------------------------------------------------------------------
// 2. Ops types — new collections owned by wriksh-ops
// ---------------------------------------------------------------------------

export type CatalogueSectionSlug =
  | "welcome"
  | "story"
  | "dance"
  | "music"
  | "theatre"
  | "craft"
  | "martial"
  | "festivals"
  | "providers";

export type CatalogueOverrideDoc = {
  stateSlug: string;
  displayName?: string;
  welcomeMessage?: string;
  sectionOrder?: CatalogueSectionSlug[];
  closingNote?: string;
  edition?: string;
  status?: ContentStatus;
  updatedAt?: string;
};

export type CatalogueJobDoc = {
  stateSlug: string;
  generatedBy: string;
  generatedAt: string;
  durationMs: number;
  pageCount?: number;
  byteSize?: number;
  fileUrl?: string;
  notes?: string;
};

export type MarketingCategory =
  | "post"
  | "meeting"
  | "experience"
  | "collab"
  | "ad"
  | "app-dev";

export const MARKETING_CATEGORY_LABELS: Record<MarketingCategory, string> = {
  post: "Content Post",
  meeting: "Meeting",
  experience: "Experience",
  collab: "Collab",
  ad: "Ad / Campaign",
  "app-dev": "App Dev",
};

export const MARKETING_CATEGORY_COLOR: Record<MarketingCategory, string> = {
  post: "bg-calPost",
  meeting: "bg-calMeeting",
  experience: "bg-calExperience",
  collab: "bg-calCollab",
  ad: "bg-calAd",
  "app-dev": "bg-calDev",
};

export type MarketingEventDoc = {
  _id?: string;
  title: string;
  category: MarketingCategory;
  date: string;
  endDate?: string;
  owner?: string;
  channel?: string;
  status?: "planned" | "live" | "done" | "cancelled";
  notes?: string;
  links?: { label: string; href: string }[];
  createdAt?: string;
  updatedAt?: string;
};

export type DiscordChannelDoc = {
  slug: string;
  name: string;
  channelId: string;
  guildId: string;
  purpose: string;
  /** https://discord.com/api/webhooks/... — treated as a bearer token. */
  webhookUrl: string;
  notifyCategories: MarketingCategory[];
  status?: ContentStatus;
  /** Set every time the daily digest (or manual post) runs. */
  lastPostedAt?: string;
  lastPostOk?: boolean;
  lastPostDurationMs?: number;
  lastPostNotes?: string | null;
};

export type FinanceDirection = "in" | "out";

export type FinanceTransactionDoc = {
  _id?: string;
  date: string;
  direction: FinanceDirection;
  amount: number;
  currency?: "INR";
  category: string;
  vendor?: string;
  counterparty?: string;
  stateSlug?: string;
  experienceSlug?: string;
  notes?: string;
  source: "manual" | "csv" | "razorpay" | "bank-statement";
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ArtistQuotationDoc = {
  amount: number;
  currency?: "INR";
  travelIncluded?: boolean;
  note?: string;
  receivedAt: string;
  source?: string;
};

export type ArtistRatingDoc = {
  score: number;
  reviewer: string;
  eventSlug?: string;
  note?: string;
  ratedAt: string;
};

export type DiscoverArtistDoc = {
  slug: string;
  name: string;
  stateSlug: string;
  location?: { type: "Point"; coordinates: [number, number] };
  city?: string;
  artForms: string[];
  bio?: string;
  verifiedNote?: string;
  pastPerformances?: { eventSlug?: string; date: string; venue?: string; rating?: number }[];
  priceRange?: { min: number; max: number; currency?: "INR" };
  quotations?: ArtistQuotationDoc[];
  ratings?: ArtistRatingDoc[];
  contact?: { phone?: string; email?: string; website?: string };
  coverImage?: string;
  status?: ContentStatus;
  updatedAt?: string;
};

export type TenderDoc = {
  _id?: string;
  referenceId: string;
  title: string;
  issuingBody: string;
  stateSlug?: string;
  publishedAt: string;
  deadline: string;
  location?: { type: "Point"; coordinates: [number, number] };
  city?: string;
  requiredArtForms: string[];
  budgetINR?: number;
  description?: string;
  documentUrl?: string;
  status?: "open" | "submitted" | "won" | "lost" | "cancelled";
  matchedArtistSlugs?: string[];
  notes?: string;
};

export type ExperienceGuideDoc = {
  _id?: string;
  slug: string;
  name: string;
  stateSlug: string;
  city?: string;
  experiences: string[];
  languages: string[];
  certifications?: string[];
  rating?: number;
  bio?: string;
  contact?: { phone?: string; email?: string };
  coverImage?: string;
  status?: ContentStatus;
};

export type LearnHostDoc = {
  _id?: string;
  slug: string;
  name: string;
  type: "ttc" | "csr" | "apprenticeship" | "workshop";
  stateSlug?: string;
  city?: string;
  artForm: string;
  duration?: string;
  feeINR?: number;
  description?: string;
  prerequisites?: string;
  contact?: { phone?: string; email?: string; website?: string };
  coverImage?: string;
  status?: ContentStatus;
};

export type MediaAssetDoc = {
  _id?: string;
  title: string;
  kind: "photo" | "video" | "doc" | "audio";
  url: string;
  thumbnailUrl?: string;
  stateSlug?: string;
  tags?: string[];
  bucket?: string;
  caption?: string;
  credit?: string;
  owner?: string;
  uploadedBy?: string;
  uploadedAt: string;
};
