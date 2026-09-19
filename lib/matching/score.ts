/**
 * Artist matching algorithm.
 *
 * Given a "brief" (art forms, optional location, optional budget) and a
 * pool of `DiscoverArtistDoc`s, return the top N artists scored on
 * three normalised signals:
 *
 *   - price   : closer to brief budget = higher score
 *   - distance: closer to brief location = higher score (haversine)
 *   - rating  : higher past ratings = higher score
 *
 * The final score is a weighted average — weights live in `WEIGHTS` below
 * and can be tuned per-deployment.
 *
 * If the brief omits a field, its weight is redistributed proportionally
 * across the remaining signals so we never divide by zero.
 */

import type { DiscoverArtistDoc, PersonDoc } from "@/lib/types";

/**
 * The matcher accepts anything with the relevant artist-shaped fields.
 * Works with both the legacy `DiscoverArtistDoc` and the unified
 * `PersonDoc` (when the person has the artist role).
 */
export type MatchableArtist = Pick<
  DiscoverArtistDoc | PersonDoc,
  "slug" | "name" | "stateSlug" | "city" | "artForms" | "priceRange" | "location" | "ratings"
> & {
  // Person-only — the matcher treats these identically.
  bio?: string;
  contact?: unknown;
};

const WEIGHTS = {
  price: 0.4,
  distance: 0.3,
  rating: 0.3,
} as const;

export type MatchBrief = {
  artForms: string[];
  /** Free-text location — we geocode loosely via the artist's stored city/state. */
  cityHint?: string;
  /** Geographic coordinates for distance matching: [lng, lat]. */
  coords?: [number, number];
  /** Target budget in INR. */
  budgetINR?: number;
};

export type MatchResult = {
  artist: MatchableArtist;
  /** 0..1 composite score. */
  score: number;
  /** Individual component scores for the breakdown UI. */
  components: {
    artForm: number;
    price: number;
    distance: number;
    rating: number;
  };
  reasons: string[];
};

function haversineKm(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const x =
    sin1 * sin1 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      sin2 * sin2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function avgRating(artist: MatchableArtist): number {
  if (!artist.ratings?.length) return 0;
  const sum = artist.ratings.reduce(
    (s: number, r: { score?: number }) => s + (r.score ?? 0),
    0
  );
  return sum / artist.ratings.length;
}

function normalisedPriceScore(artist: MatchableArtist, budget: number | undefined): number {
  if (budget == null) return 0.5;
  const range = artist.priceRange;
  if (!range) return 0.5;
  const mid = (range.min + range.max) / 2;
  if (mid <= 0) return 0.5;
  const delta = Math.abs(mid - budget) / Math.max(1, budget);
  return Math.max(0, Math.min(1, 1 - delta / 0.5));
}

function normalisedDistanceScore(artist: MatchableArtist, coords: [number, number] | undefined): number {
  if (!coords) return 0.5;
  if (!artist.location?.coordinates) return 0.5;
  const km = haversineKm(coords, artist.location.coordinates);
  return Math.max(0, Math.min(1, 1 - km / 1500));
}

function normalisedRatingScore(artist: MatchableArtist): number {
  const r = avgRating(artist);
  if (r === 0) return 0.5;
  return Math.max(0, Math.min(1, r / 5));
}

function artFormScore(artist: MatchableArtist, wanted: string[]): number {
  if (!wanted.length) return 0.5;
  const have = artist.artForms ?? [];
  const matched = wanted.filter((w: string) =>
    have.some((h: string) => h.toLowerCase().includes(w.toLowerCase()))
  ).length;
  if (matched === 0) return 0;
  return matched / wanted.length;
}

export function matchArtists(
  brief: MatchBrief,
  pool: MatchableArtist[],
  limit = 5
): MatchResult[] {
  const wantPrice = brief.budgetINR != null;
  const wantDistance = brief.coords != null;
  const wantRating = true;
  const activeWeightSum =
    (wantPrice ? WEIGHTS.price : 0) +
    (wantDistance ? WEIGHTS.distance : 0) +
    (wantRating ? WEIGHTS.rating : 0) ||
    1;

  const wPrice = wantPrice ? WEIGHTS.price / activeWeightSum : 0;
  const wDistance = wantDistance ? WEIGHTS.distance / activeWeightSum : 0;
  const wRating = wantRating ? WEIGHTS.rating / activeWeightSum : 0;

  const scored: MatchResult[] = pool.map((artist) => {
    const artForm = artFormScore(artist, brief.artForms);
    const price = normalisedPriceScore(artist, brief.budgetINR);
    const distance = normalisedDistanceScore(artist, brief.coords);
    const rating = normalisedRatingScore(artist);

    if (brief.artForms.length > 0 && artForm === 0) {
      return {
        artist,
        score: 0,
        components: { artForm, price, distance, rating },
        reasons: ["no art-form overlap"],
      };
    }

    const composite = artForm * (price * wPrice + distance * wDistance + rating * wRating);

    const reasons: string[] = [];
    if (artForm > 0) reasons.push(`covers ${(artist.artForms ?? []).slice(0, 2).join(", ")}`);
    if (price > 0.7) reasons.push(`within budget`);
    if (distance > 0.7) reasons.push(`nearby`);
    if (rating > 0.7) reasons.push(`strong ratings (${avgRating(artist).toFixed(1)}/5)`);

    return {
      artist,
      score: composite,
      components: { artForm, price, distance, rating },
      reasons,
    };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
