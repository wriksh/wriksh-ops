# Wriksh Ops — Dhoomkethu

Operations console for Wriksh. **All modules live.**

| # | Module | Path | Status |
|---|---|---|---|
| 1 | State catalogue pipeline (from MongoDB) | `/cataloguing` | ✅ Live |
| 2 | Marketing & content calendar | `/marketing` | ✅ Live |
| 3 | Discord server with wrikshbot | `/discord` | ✅ Live |
| 4 | Discord notifications for content calendar | (cron + wrikshbot) | ✅ Live |
| 6 | Finance management (Airtable-style + CSV) | `/finance` | ✅ Live |
| 7 | Discover Artists + matching + tenders | `/discover-artists` | ✅ Live |
| 8 | Experience Guides | `/experience-guides` | ✅ Live |
| 9 | Learn Hosts · TTC · CSR | `/learn-hosts` | ✅ Live |
| 10 | Media assets & operating docs | `/library` (unified) | ✅ Live |
| 11 | Project Dhoomkethu dashboard | `/` | ✅ Live |

The unified **Library** tab (`/library`) replaced the original separate
**Media** + **Docs** tabs. It merges git-tracked Markdown in `docs/`
with uploaded media assets (Vercel Blob + `media_assets` Mongo
collection) into one searchable, taggable index.

The original item #5 (Channel-of-Energy pillar wiring through Discover → Experience → Learn) is now expressed by Discover Artists (#7) + Experience Guides (#8) + Learn Hosts (#9) sharing a single DiscoverArtist collection (`discover_artists`) and the matching algorithm in `lib/matching/score.ts`.

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
```
