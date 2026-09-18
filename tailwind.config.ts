import type { Config } from "tailwindcss";

/**
 * Tailwind config for wriksh-ops.
 *
 * The Wriksh brand palette is the exact CSS variable set extracted from the
 * reference state-catalogue HTML (`catalogues/wriksh_KAR_catalogue/
 * catalogue_KAR_Eng.html`). Treat that file as the source of truth — any
 * change here should mirror a change there, and vice-versa.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        linen: "#F4ECDD",
        parchment: "#EFE6D2",
        "parchment-2": "#E9DEC2",
        stone: "#C9B98C",
        ink: "#1B1812",
        "ink-soft": "#3A3324",
        gold: "#C8932F",
        "gold-bright": "#E5B14A",
        "gold-soft": "#D9A441",
        clay: "#B8512C",
        "clay-deep": "#8A3A1E",
        umber: "#6E4B25",
        moss: "#5C7B3F",
        forest: "#2D4521",
        rust: "#C7603A",
        "rust-deep": "#9B4221",
        // Dhoomkethu dashboard accent colors (category-coded).
        calPost: "#D9A441",     // gold
        calMeeting: "#B8512C",  // clay
        calExperience: "#5C7B3F", // moss
        calCollab: "#2D4521",   // forest
        calAd: "#C7603A",       // rust
        calDev: "#6E4B25",      // umber
      },
      fontFamily: {
        serif: ['"Spectral"', '"EB Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,24,18,0.06), 0 8px 24px rgba(27,24,18,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
