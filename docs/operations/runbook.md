---
title: Wriksh operations runbook
tags: [oncall, finance, catalogue]
bucket: operations
---

# Wriksh operations runbook

This is the team's day-to-day reference for keeping Wriksh alive: catalogue pipeline, Discord cron, finance import, and the most common failure modes.

## Daily checklist

- **08:00 IST** — `npm run cron:daily` posts the daily digest to all configured Discord channels. Verify it landed via `/discord → Run history`.
- **10:00 IST** — Review `cron_jobs` for partial-failure entries (status: `partial`). Re-trigger manually with `npm run cron:daily -- --channel <slug>`.
- **17:00 IST** — Skim the Dhoomkethu dashboard for KPI anomalies.

## Catalogue pipeline

Catalogue PDFs are generated from the live MongoDB cluster via `@react-pdf/renderer`. To regenerate any state:

```bash
npm run catalogue:render -- karnataka --out ./out/karnataka.pdf
```

If the render fails with "State not found in MongoDB":

1. Confirm the state slug in `wriksh-dev`'s `states` collection.
2. Confirm at least one tradition exists with `stateSlug` matching.
3. Re-run after seeding the missing data via `/admin/states` or `/admin/traditions`.

## Finance

CSV imports go through `POST /api/finance/import` with body `{ csv: "..." }`. Expected columns:

```
date, direction, amount, category, vendor, counterparty, stateSlug, experienceSlug, notes
```

`direction` must be `in` or `out`. Empty cells become `undefined`.

## Discord bot

If `wrikshbot` won't come up:

1. `DISCORD_BOT_TOKEN` must be set in `.env.local`.
2. The token must belong to a bot that's been invited with `bot` + `applications.commands` scopes.
3. `DISCORD_GUILD_ID` must match the server you want the slash commands to register in.

When the bot refuses to start, the error message in `stdout` is explicit — start there.

## Failover

MongoDB Atlas has automatic failover. The Node client (`lib/mongodb.ts`) keeps a single connection across hot reloads. If you see repeated "MONGODB_URI is not set" in logs:

- Confirm `.env.local` is intact.
- Restart `npm run dev` — the env is loaded once at boot.
