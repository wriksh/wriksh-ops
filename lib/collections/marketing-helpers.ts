/**
 * Client-safe helpers for the marketing admin UI.
 * (Mirrors the pattern used in discord-helpers.ts.)
 */

import type {
  MarketingEventDoc,
  MarketingCategory,
} from "@/lib/types";

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
