# Wriksh Ops · Dhoomkethu

Operations console for Wriksh — state catalogue pipeline, marketing calendar,
finance, and discover-artist ops. A standalone Next.js 14 app that shares the
same MongoDB cluster as the customer-facing `wriksh-dev` Next.js app.

## Quick start

```bash
# 1. install
npm install

# 2. verify the env has MongoDB credentials
#    (.env.local is pre-populated; same Mongo URI as wriksh-dev)

# 3. dev server
npm run dev

# 4. catalogue sanity check
npm run catalogue:list

# 5. render a state catalogue to disk
npm run catalogue:render -- karnataka --out ./out/karnataka.pdf
```

Then open <http://localhost:3000> for the Dhoomkethu dashboard, or
<http://localhost:3000/cataloguing> for the catalogue pipeline.

## Modules

| Module | Phase | Status | Path |
|---|---|---|---|
| **Dhoomkethu dashboard** | 7 | ✅ Live | `/` |
| **State catalogue pipeline** | 1 | ✅ Live | `/cataloguing` |
| **Marketing calendar** | 2 | ⏳ Placeholder | `/marketing` |
| **Discord · wrikshbot** | 3 | ⏳ Placeholder | `/discord` |
| **Finance (Money)** | 4 | ⏳ Placeholder | `/finance` |
| **Discover artists + tenders** | 5 | ⏳ Placeholder | `/discover-artists` |
| **Experience guides** | 6 | ⏳ Placeholder | `/experience-guides` |
| **Learn hosts · TTC · CSR** | 6 | ⏳ Placeholder | `/learn-hosts` |
| **Media assets** | 7 | ⏳ Placeholder | `/media` |

## Architecture

```
wriksh-ops/
├── app/                 # Next.js 14 App Router
│   ├── page.tsx         # Dhoomkethu dashboard
│   ├── cataloguing/     # Phase 1 — state catalogue admin
│   ├── marketing/       # Phase 2 — calendar
│   ├── ...
│   └── api/catalogue/   # PDF streaming endpoint
├── components/          # SideNav, TopBar, KPI tiles, generator button
├── lib/
│   ├── mongodb.ts       # Singleton Mongo client (mirrors wriksh-dev)
│   ├── brand.ts         # Wriksh palette + Spectral font tokens
│   ├── types.ts         # Mongo doc types — 9 mirror + 9 ops collections
│   ├── logger.ts        # Structured JSON logger
│   ├── catalogue/       # @react-pdf renderer + brand stylesheet
│   └── collections/     # One file per Mongo collection (SOLID)
├── scripts/             # CLI: catalogue:list, catalogue:render
└── styles/              # brand CSS variables
```

## Design principles

- **Single source of truth** — brand palette lives in `lib/brand.ts` and
  `tailwind.config.ts` simultaneously. A change here is a change everywhere.
- **One file per collection** — every Mongo collection gets its own
  `lib/collections/<name>.ts` module with focused read/write functions,
  each timed via `logger.timed` for ops visibility.
- **SOLID** — `catalogue/Document.tsx` (presentation) vs.
  `catalogue/render.ts` (engine) vs. `app/api/catalogue/[state]/pdf/route.ts`
  (HTTP) vs. `collections/catalogue.ts` (data).
- **Logging, never `console.log`** — every server-side path emits structured
  JSON with `{ ts, level, msg, collection, action, duration_ms }`.
- **Doc-strings on every exported function** — explain intent, not
  implementation.

## Catalogue PDF generation

The catalogue renderer is a near-verbatim port of the reference Karnataka
HTML (`Catalogues/wriksh_KAR_catalogue/catalogue_KAR_Eng.html`) into
`@react-pdf/renderer`. Each page mirrors the source HTML structure:

1. Cover (state name + tagline)
2. Welcome (per-state intro copy from `catalogue_overrides`)
3. Story (state.story paragraphs)
4. Traditions — Dance / Music / Theatre / Craft / Martial Arts (3-col tile grid)
5. Festivals (per-state festival list)
6. Verified providers (one card per provider)
7. Closing / contact (forest-green box)

Section ordering and intro copy are configurable per-state via the
`catalogue_overrides` collection.

## Environment

The `.env.local` is shared with `wriksh-dev`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas cluster (read/write to `wriksh` db) |
| `MONGODB_DB` | Database name (default: `wriksh`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for media uploads (Phase 7) |
| `ADMIN_PASSWORD` | Optional gate on the `/admin/*` routes |
| `DISCORD_BOT_TOKEN` | Phase 3 |
| `DISCORD_GUILD_ID` | Phase 3 |
