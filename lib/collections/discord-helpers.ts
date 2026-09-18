/**
 * Pure helpers for the Discord admin UI.
 *
 * Lives in its own file (no `server-only` guard) because the client
 * component `components/discord/DiscordAdmin.tsx` needs to import these
 * symbols — Next.js client bundles can't import the server-only
 * `lib/collections/discord.ts`.
 */

import {
  MARKETING_CATEGORY_LABELS,
  type MarketingCategory,
} from "@/lib/types";

export const ALL_CATEGORIES: MarketingCategory[] = Object.keys(
  MARKETING_CATEGORY_LABELS
) as MarketingCategory[];

/**
 * Mask a webhook URL for display: show first 18 path chars + last 4 +
 * the host. Keeps operators confident the URL is real while hiding the
 * secret token.
 */
export function maskWebhookUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const head = path.slice(0, 18);
    const tail = path.slice(-4);
    return `${u.protocol}//${u.host}${head}…${tail}`;
  } catch {
    return "(invalid url)";
  }
}
