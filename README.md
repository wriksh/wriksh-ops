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

## Library

The unified `/library` tab holds every knowledge asset the team uses.

- **Repo docs** — Markdown under `docs/**.md`, git-tracked. Tags are
  inferred from path (`docs/operations/runbook.md` → `#operations`) plus
  optional front-matter (`tags: [oncall, finance]`).
- **Uploads** — anything you drop on the page goes to Vercel Blob via
  `POST /api/library/upload`. Metadata lands in MongoDB's `media_assets`
  collection. Tags, bucket, caption and credit are written alongside.

Search uses a BM25-lite scorer (title 3×, tag 2×, heading 2.5×, body 1×)
across the merged index. Build time: <50 ms for ~500 entries.

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
| **Marketing calendar** | 2 | ✅ Live | `/marketing` |
| **Discord · wrikshbot** | 3 | ✅ Live | `/discord` |
| **Finance (Money)** | 4 | ✅ Live | `/finance` |
| **People** (artists · guides · hosts · gov · vendors · team) | 5/6 | ✅ Live | `/people` |
| **Library** (repo docs + uploaded media) | 7 | ✅ Live | `/library` |

The three earlier tabs (`/discover-artists`, `/experience-guides`,
`/learn-hosts`) have been unified into a single **`/people`** tab with a
tag-driven contact database. Old routes 308-redirect to
`/people?role=<role>`.

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

## Discord · wrikshbot (Phase 3)

Two pieces that share the same MongoDB and the same MiniMax wrapper:

| Piece | Purpose | How to run |
|---|---|---|
| **Daily reminder cron** | At `DISCORD_CRON_HOUR:MINUTE` every day (default 08:00 IST), assembles "today at Wriksh" from MongoDB, enriches with MiniMax, and POSTs to every `discord_channels` row whose `notifyCategories` overlaps today. | `npm run cron:daily -- --dry-run` (preview) or `npm run cron:daily` (live) |
| **wrikshbot** | Long-running Discord gateway bot. Registers 5 slash commands (`/today`, `/ask`, `/catalogue`, `/artists`, `/tenders`) on your guild. Also runs the same daily cron in-process via `node-cron`. | `npm run bot` |

### Setting up Discord

1. Go to <https://discord.com/developers/applications> → **New Application** → **Bot** → copy token to `DISCORD_BOT_TOKEN` in `.env.local`.
2. Copy the **Application ID** to `DISCORD_CLIENT_ID` (used for slash-command registration) and the **Public Key** to `DISCORD_PUBLIC_KEY`.
3. Right-click your Discord server → **Copy Server ID** → set as `DISCORD_GUILD_ID`.
4. Invite the bot with `bot` + `applications.commands` scopes.
5. In each target channel: **Settings → Integrations → Webhooks → New Webhook** → copy URL.
6. In the wriksh-ops admin UI at `/discord`, click **+ Add channel**, paste the webhook URL, and pick the marketing categories you want notified.

### Triggering the daily cron manually

```bash
npm run cron:daily -- --dry-run                   # preview without posting
npm run cron:daily                                # live: posts to all eligible channels
npm run cron:daily -- --channel ops --dry-run    # only test against the "ops" channel

# HTTP (requires X-Wriksh-Cron-Secret matching DISCORD_CRON_SECRET):
curl -H "x-wriksh-cron-secret: $DISCORD_CRON_SECRET" \
     http://localhost:3000/api/discord/cron/daily
```

Every run is audit-logged in the `cron_jobs` MongoDB collection and surfaced on `/discord`.

### Slash commands

| Command | Description |
|---|---|
| `/today` | Today's marketing calendar + finance + recent catalogues — same digest the cron posts, inline. |
| `/ask <question>` | MiniMax-powered Q&A over live MongoDB context (counts, recent renders, finance summary). |
| `/catalogue <state>` | Renders a state catalogue PDF and posts it as an attachment. |
| `/artists [state]` | Lists up to 10 discover artists (optionally filtered by state). |
| `/tenders` | Lists open government/institutional tenders, sorted by deadline. |

### Deploying to Fly.io

```bash
# First time only:
fly launch --no-deploy            # picks up the fly.toml in this repo
fly secrets set \
  DISCORD_BOT_TOKEN=... \
  DISCORD_GUILD_ID=... \
  DISCORD_PUBLIC_KEY=... \
  DISCORD_CRON_SECRET=... \
  WRIKSHBOT_ALLOWED_USER_IDS=... \
  MINIMAX_API_KEY=... \
  MONGODB_URI=...

fly deploy
fly open                          # opens the admin UI in your browser
```

The bot container runs both `next start` (admin UI on :3000) and `wrikshbot.ts` (gateway + in-process cron).
