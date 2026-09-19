# Wriksh Ops — Dhoomkethu

Operations console for Wriksh. **All modules live.**

| # | Module | Path | Status |
|---|---|---|---|
| 1 | State catalogue pipeline (from MongoDB) | `/cataloguing` | ✅ Live |
| 2 | Marketing & content calendar | `/marketing` | ✅ Live |
| 3 | Discord server with wrikshbot | `/discord` | ✅ Live |
| 4 | Discord notifications for content calendar | (cron + wrikshbot) | ✅ Live |
| 6 | Finance management (Airtable-style + CSV) | `/finance` | ✅ Live |
| 7 | Discover Artists (now under People) | `/people?role=artist` | ✅ Live |
| 8 | Experience Guides (now under People) | `/people?role=guide` | ✅ Live |
| 9 | Learn Hosts · TTC · CSR (now under People) | `/people?role=host` | ✅ Live |
| 10 | Media assets & operating docs | `/library` (unified) | ✅ Live |
| 11 | Project Dhoomkethu dashboard | `/` | ✅ Live |

The unified **People** tab (`/people`) replaced the original separate
**Discover Artists** / **Experience Guides** / **Learn Hosts** tabs.
It merges the three collections (`discover_artists`, `experience_guides`,
`learn_hosts`) into one tagged contact database. Old routes 308-redirect
to `/people?role=<role>`. Use `npm run migrate:people` to copy legacy
rows into `people` (idempotent).

The unified **Library** tab (`/library`) replaced the original separate
**Media** + **Docs** tabs. It merges git-tracked Markdown in `docs/`
with uploaded media assets (Vercel Blob + `media_assets` Mongo
collection) into one searchable, taggable index.

## Quick start

```bash
npm install
npm run dev               # http://localhost:3000
```

## CLI tools

```bash
npm run catalogue:list                                    # tab-separated state → counts
npm run catalogue:render -- karnataka --out ./out/k.pdf   # render a state catalogue PDF
npm run cron:daily -- --dry-run                           # preview Discord daily digest
npm run cron:daily                                        # actually post to Discord
npm run bot                                               # start the wrikshbot gateway
npm run migrate:people                                     # one-shot: legacy → unified People
```
