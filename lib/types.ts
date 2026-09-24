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
// Mirror types for the Experiences and Learn collections on wriksh-dev.
//
// Both collections live on the shared Mongo cluster. They are READ-ONLY
// here — wriksh-ops only consumes them to render PDFs and analytics
// surfaces. Admin CRUD lives in wriksh-dev.
//
// We declare only the fields we actually read in the catalogue PDF renderer
// (and the dashboard). Anything else is ignored on purpose so the schema
// can drift in wriksh-dev without breaking ops.
// ---------------------------------------------------------------------------

export type ExperienceType =
  | "workshop"
  | "immersion"
  | "retreat"
  | "residency"
  | "trip";

export type ExperienceGroupType = "private" | "group" | "both";

export type ExperienceFaq = { q: string; a: string };
export type ExperienceReview = {
  name: string;
  quote: string;
  rating: number;
};
export type ExperienceScheduleItem = {
  /** e.g. "Day 1 morning", "Day 2 evening". */
  label: string;
  body: string;
};
export type ExperienceCarouselItem = {
  kind: "image" | "video";
  url: string;
  caption?: string;
};

export type ExperienceDoc = {
  slug: string;
  title: string;
  stateSlug: string;
  city: string;
  categoryIds: string[];
  type: ExperienceType;
  durationLabel: string;
  durationDays: number;
  groupType: ExperienceGroupType;
  priceINR: number;
  priceUnit: "person" | "group";
  compareAtPriceINR?: number;
  includes: string[];
  excludes: string[];
  providerSlugs?: string[];
  heroTheme: string;
  /** Real cover image URL — used directly in the PDF cover. */
  coverImage?: string;
  story: string;
  whyThisMatters: string;
  culturalBackground: string;
  schedule: ExperienceScheduleItem[];
  difficulty: string;
  difficultyLevel: "Easy" | "Moderate" | "Demanding";
  ageSuitability: string;
  prepInstructions: string[];
  carousel?: ExperienceCarouselItem[];
  faqs: ExperienceFaq[];
  reviews: ExperienceReview[];
  featured?: boolean;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
};

export type LearnLeadTeacher = {
  name: string;
  role: string;
  bio: string;
  image?: string;
};

export type LearnCohortDate = {
  startDate: string;
  endDate?: string;
  published?: boolean;
  notes?: string;
};

export type LearnGalleryItem = {
  url: string;
  caption?: string;
};

export type LearnDoc = {
  slug: string;
  title: string;
  stateSlug: string;
  city: string;
  categoryIds: string[];
  programKind: "course" | "ttc" | "residency" | "retreat";
  durationLabel: string;
  durationDays: number;
  groupType: ExperienceGroupType;
  priceINR: number;
  priceUnit: "person" | "group";
  currency?: string;
  accommodationIncluded?: boolean;
  includes: string[];
  excludes: string[];
  providerSlugs?: string[];
  heroTheme: string;
  /** Real cover image URL — used directly in the PDF cover. */
  coverImage?: string;
  story: string;
  whyThisMatters: string;
  culturalBackground: string;
  schedule: ExperienceScheduleItem[];
  difficulty: string;
  difficultyLevel: "Easy" | "Moderate" | "Demanding";
  ageSuitability: string;
  prepInstructions: string[];
  whatToBring: string[];
  gallery?: LearnGalleryItem[];
  carousel?: ExperienceCarouselItem[];
  faqs: ExperienceFaq[];
  reviews: ExperienceReview[];
  language: string[];
  prerequisites: string[];
  certification?: string;
  leadTeacher: LearnLeadTeacher;
  intakeSize?: number;
  cohortDates: LearnCohortDate[];
  cancellationPolicy: string;
  depositINR?: number;
  depositPercent?: number;
  featured?: boolean;
  tags?: string[];
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

/**
 * Which kind of PDF a given `catalogue_jobs` row represents.
 *
 * Kept as a string-literal union (not the same as the experience marketing
 * category enum) because the PDF generator is its own axis — the catalogue
 * PDF, the experiences PDF, and the learn PDF are three siblings under the
 * same audit-log table. Existing rows without this field are treated as
 * `state-catalogue` for backwards compatibility.
 */
export type CataloguePdfKind = "state-catalogue" | "experiences" | "learn";

export const CATALOGUE_PDF_KIND_LABELS: Record<CataloguePdfKind, string> = {
  "state-catalogue": "State Catalogue",
  experiences: "Experiences",
  learn: "Learn",
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
  /** Discriminator — defaults to "state-catalogue" on legacy rows. */
  pdfKind?: CataloguePdfKind;
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
  _id?: string;
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

/**
 * Unified People / Contacts document.
 *
 * Replaces the three separate collections (`discover_artists`,
 * `experience_guides`, `learn_hosts`) with one tagged contact record.
 *
 * Every role-specific field is optional. `tags` is the heart of the
 * unification — it carries the facet values ("discover", "experience",
 * "learn", "government", "vendor", "team", plus free-form tags like
 * state slugs, art forms, languages, etc).
 *
 * Search-by-tag + search-by-skill: `stateSlug`, `artForms`, `languages`
 * are also indexed for fast filtering on the /people page.
 */
export type PersonRole = "artist" | "guide" | "host" | "government" | "vendor" | "team";

export type PersonContact = {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
};

export type PersonDoc = {
  _id?: string;
  /** URL-safe slug. */
  slug: string;
  name: string;
  /** Discriminated role tags — one person can be many. */
  roles: PersonRole[];
  /** Free-form tags: state slugs, art forms, languages, departments, etc. */
  tags: string[];
  stateSlug?: string;
  city?: string;
  location?: { type: "Point"; coordinates: [number, number] };

  /** Bio / notes. */
  bio?: string;

  /** Contact info — single source of truth per person. */
  contact: PersonContact;

  coverImage?: string;
  status?: ContentStatus;
  source?: "manual" | "wriksh-onboarding" | "csv" | "tender";
  verifiedNote?: string;
  links?: { label: string; href: string }[];

  // ---- Artist-specific ----
  artForms?: string[];
  pastPerformances?: { eventSlug?: string; date: string; venue?: string; rating?: number }[];
  quotations?: ArtistQuotationDoc[];
  ratings?: ArtistRatingDoc[];
  priceRange?: { min: number; max: number; currency?: "INR" };

  // ---- Guide-specific ----
  languages?: string[];
  certifications?: string[];
  experiences?: string[];
  /** Average guide rating (single number) — distinct from the artist `ratings[]`. */
  rating?: number;

  // ---- Host-specific ----
  hostType?: "ttc" | "csr" | "apprenticeship" | "workshop";
  duration?: string;
  feeINR?: number;
  prerequisites?: string;
  description?: string;
  /** Host-specific single art form (guides also use `artForms`). */
  artForm?: string;

  // ---- Misc ----
  updatedAt?: string;
};

export type MediaAssetDoc = {
  _id?: string;
  title: string;
  /** "photo" | "video" | "doc" | "pdf" | "audio" — the `pdf` variant
   *  was added with the Library unification. */
  kind: "photo" | "video" | "doc" | "pdf" | "audio";
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
