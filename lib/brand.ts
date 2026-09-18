/**
 * Single source of truth for the Wriksh brand palette & typography.
 *
 * The values here are extracted verbatim from the reference state-catalogue
 * HTML (catalogues/wriksh_KAR_catalogue/catalogue_KAR_Eng.html) and the
 * customer-facing wriksh-dev Tailwind config. Keep this file in lock-step
 * with both — if you change a colour here, change it there too.
 *
 * These tokens are used both by the web UI (Tailwind classes that reference
 * the same hex values via tailwind.config.ts) and by the @react-pdf catalogue
 * renderer (which needs literal hex strings — it does not have access to
 * Tailwind).
 */

export const WRIKSH_BRAND = {
  colors: {
    linen: "#F4ECDD",
    parchment: "#EFE6D2",
    parchment2: "#E9DEC2",
    stone: "#C9B98C",
    ink: "#1B1812",
    inkSoft: "#3A3324",
    gold: "#C8932F",
    goldBright: "#E5B14A",
    goldSoft: "#D9A441",
    clay: "#B8512C",
    clayDeep: "#8A3A1E",
    umber: "#6E4B25",
    moss: "#5C7B3F",
    forest: "#2D4521",
    rust: "#C7603A",
    rustDeep: "#9B4221",
  },
  fonts: {
    /** Primary serif used everywhere — matches the KAR catalogue. */
    serif: "Spectral",
    /** Fallback humanist sans for micro-UI (Tailwind config also lists Inter). */
    sans: "Inter",
  },
} as const;

/**
 * Six marketing-calendar category colours, indexed by the same enum used
 * elsewhere (see lib/types.ts).
 */
export const CALENDAR_CATEGORY_COLORS = {
  post: WRIKSH_BRAND.colors.gold,
  meeting: WRIKSH_BRAND.colors.clay,
  experience: WRIKSH_BRAND.colors.moss,
  collab: WRIKSH_BRAND.colors.forest,
  ad: WRIKSH_BRAND.colors.rust,
  "app-dev": WRIKSH_BRAND.colors.umber,
} as const;
