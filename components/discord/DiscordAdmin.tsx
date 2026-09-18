"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_CATEGORIES,
  maskWebhookUrl,
} from "@/lib/collections/discord-helpers";
import type { DiscordChannelDoc } from "@/lib/types";
import type { CronJobDoc } from "@/lib/collections/cron";
import {
  MARKETING_CATEGORY_COLOR,
  MARKETING_CATEGORY_LABELS,
  type MarketingCategory,
} from "@/lib/types";

/**
 * /discord admin console — client component.
 *
 * Three sections:
 *   - Cron status (read-only table + "Run now" button)
 *   - Channels list (CRUD — add/edit/delete with masked webhook URLs)
 *   - Bot health (env + slash command roster, read-only)
 */
export default function DiscordAdmin({
  channels: initialChannels,
  recentRuns,
  lastRun,
  botEnv,
}: {
  channels: DiscordChannelDoc[];
  recentRuns: CronJobDoc[];
  lastRun: CronJobDoc | null;
  botEnv: {
    hasBotToken: boolean;
    guildId: string;
    cronHour: string;
    cronMinute: string;
    cronTz: string;
    hasCronSecret: boolean;
    allowedUserCount: number;
  };
}) {
  const router = useRouter();
  const [channels, setChannels] = useState<DiscordChannelDoc[]>(initialChannels);
  const [editing, setEditing] = useState<Partial<DiscordChannelDoc> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cronBusy, setCronBusy] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  function startNew() {
    setEditing({
      name: "",
      channelId: "",
      guildId: process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ?? "",
      purpose: "",
      webhookUrl: "",
      notifyCategories: [],
      status: "published",
    });
    setError(null);
  }

  function startEdit(c: DiscordChannelDoc) {
    setEditing(c);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing.slug;
      const url = isCreate ? "/api/discord/channels" : `/api/discord/channels/${editing.slug}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      // Refresh from server
      const list = await fetch("/api/discord/channels").then((r) => r.json());
      setChannels(list.channels ?? []);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete channel "${slug}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/discord/channels/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      const list = await fetch("/api/discord/channels").then((r) => r.json());
      setChannels(list.channels ?? []);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runCronNow(dryRun: boolean) {
    setCronBusy(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/discord/cron/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json().catch(() => ({}));
      setCronResult(
        res.ok
          ? `${dryRun ? "Dry-run" : "Run"} complete — posted to ${data.channelsPosted}/${data.channelsAttempted} channels (LLM: ${data.introSource})`
          : `Failed: ${data.error ?? res.status}`
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setCronResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCronBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
          Phase 3  ·  Pillar of Time
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Discord · wrikshbot</h1>
        <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
          Daily reminders via cron + webhooks. Interactive commands via the
          wrikshbot gateway connection. Powered by MiniMax for friendly copy
          and natural-language Q&amp;A.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      {/* ---- Cron status ------------------------------------------ */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
              Daily reminder cron
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink">Run history</h2>
            <p className="mt-1 font-body text-xs text-umber">
              Last run: {lastRun ? new Date(lastRun.startedAt).toLocaleString() : "never"} ·
              {" "}
              {botEnv.cronHour}:{String(botEnv.cronMinute).padStart(2, "0")} {botEnv.cronTz}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={cronBusy}
              onClick={() => runCronNow(true)}
              className="rounded-full border border-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-gold hover:bg-gold hover:text-linen disabled:opacity-50"
            >
              {cronBusy ? "…" : "Dry-run"}
            </button>
            <button
              type="button"
              disabled={cronBusy}
              onClick={() => runCronNow(false)}
              className="rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
            >
              {cronBusy ? "Running…" : "Run now"}
            </button>
          </div>
        </div>
        {cronResult ? (
          <p className="mt-3 font-body text-xs text-ink-soft">{cronResult}</p>
        ) : null}
        {recentRuns.length === 0 ? (
          <p className="mt-4 font-body text-sm text-ink-soft">
            No cron runs yet. The bot process (or HTTP trigger) will create
            the first entry on its next tick.
          </p>
        ) : (
          <table className="mt-4 w-full font-body text-sm">
            <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
              <tr>
                <th className="py-2">When</th>
                <th className="py-2">Trigger</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Channels</th>
                <th className="py-2 text-right">Events</th>
                <th className="py-2 text-right">Duration</th>
                <th className="py-2 text-right">LLM</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.jobId} className="border-b border-stone/20">
                  <td className="py-2 text-ink-soft">{new Date(r.startedAt).toLocaleString()}</td>
                  <td className="py-2 text-ink-soft">{r.triggeredBy ?? "—"}</td>
                  <td className="py-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
                        (r.status === "success"
                          ? "bg-moss/20 text-moss"
                          : r.status === "partial"
                          ? "bg-gold/20 text-gold"
                          : "bg-clay/20 text-clay")
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 text-right text-ink-soft">
                    {r.channelsPosted}/{r.channelsAttempted}
                  </td>
                  <td className="py-2 text-right text-ink-soft">{r.eventCount}</td>
                  <td className="py-2 text-right text-ink-soft">{r.durationMs}ms</td>
                  <td className="py-2 text-right text-ink-soft">{r.llmSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---- Channels list ----------------------------------------- */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
              Discord channels
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink">
              {channels.length} channel{channels.length === 1 ? "" : "s"} configured
            </h2>
            <p className="mt-1 font-body text-xs text-umber">
              Webhook URLs are stored verbatim and treated as bearer tokens.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={startNew}
            className="rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
          >
            + Add channel
          </button>
        </div>

        {channels.length === 0 ? (
          <p className="mt-4 font-body text-sm text-ink-soft">
            No channels yet. Add one to start receiving the daily digest.
          </p>
        ) : (
          <table className="mt-4 w-full font-body text-sm">
            <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Webhook</th>
                <th className="py-2">Categories</th>
                <th className="py-2">Last post</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.slug} className="border-b border-stone/20">
                  <td className="py-2">
                    <div className="font-display text-ink">{c.name}</div>
                    <div className="font-mono text-[11px] text-umber">{c.slug}</div>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-ink-soft">
                    {maskWebhookUrl(c.webhookUrl)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.notifyCategories.length === 0 ? (
                        <span className="font-body text-xs italic text-umber">
                          all
                        </span>
                      ) : (
                        c.notifyCategories.map((cat: MarketingCategory) => (
                          <span
                            key={cat}
                            className={
                              "rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-linen " +
                              (MARKETING_CATEGORY_COLOR[cat as MarketingCategory] ?? "bg-stone")
                            }
                          >
                            {MARKETING_CATEGORY_LABELS[cat as MarketingCategory] ?? cat}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-ink-soft">
                    {c.lastPostedAt ? (
                      <>
                        {new Date(c.lastPostedAt).toLocaleString()}
                        {c.lastPostOk === false ? (
                          <span className="ml-2 rounded-full bg-clay/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-clay">
                            failed
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="italic text-umber">never</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="mr-2 font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.slug)}
                      className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ---- Editor modal ----------------------------------------- */}
        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
              <h3 className="font-display text-2xl text-ink">
                {editing.slug ? `Edit ${editing.slug}` : "New channel"}
              </h3>
              <div className="mt-4 space-y-3">
                <Field label="Name">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </Field>
                <Field label="Discord channel ID">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.channelId ?? ""}
                    onChange={(e) => setEditing({ ...editing, channelId: e.target.value })}
                  />
                </Field>
                <Field label="Guild ID">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.guildId ?? ""}
                    onChange={(e) => setEditing({ ...editing, guildId: e.target.value })}
                  />
                </Field>
                <Field label="Purpose">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.purpose ?? ""}
                    onChange={(e) => setEditing({ ...editing, purpose: e.target.value })}
                  />
                </Field>
                <Field label="Webhook URL">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={editing.webhookUrl ?? ""}
                    onChange={(e) => setEditing({ ...editing, webhookUrl: e.target.value })}
                  />
                </Field>
                <Field label="Notify on these categories (empty = all)">
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map((cat) => {
                      const checked = (editing.notifyCategories ?? []).includes(cat);
                      return (
                        <label
                          key={cat}
                          className={
                            "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 font-body text-[11px] uppercase tracking-wider " +
                            (checked
                              ? "border-gold bg-gold/10 text-gold"
                              : "border-stone/40 text-ink-soft")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(editing.notifyCategories ?? []);
                              if (e.target.checked) next.add(cat);
                              else next.delete(cat);
                              setEditing({ ...editing, notifyCategories: Array.from(next) });
                            }}
                          />
                          {MARKETING_CATEGORY_LABELS[cat]}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-stone/60 px-4 py-2 font-body text-[11px] uppercase tracking-wider text-umber hover:bg-parchment"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={save}
                  className="rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ---- Bot health ------------------------------------------- */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
          wrikshbot health
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink">Bot environment</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Health label="Bot token configured" ok={botEnv.hasBotToken} hint="DISCORD_BOT_TOKEN in .env.local" />
          <Health label="Guild ID configured" ok={!!botEnv.guildId} hint={botEnv.guildId || "DISCORD_GUILD_ID in .env.local"} />
          <Health label="Cron secret set" ok={botEnv.hasCronSecret} hint="DISCORD_CRON_SECRET in .env.local" />
          <Health label="Allowed user list" ok={botEnv.allowedUserCount > 0} hint={botEnv.allowedUserCount > 0 ? `${botEnv.allowedUserCount} user(s) allowed` : "WRIKSHBOT_ALLOWED_USER_IDS (empty = all)"} />
        </dl>
        <h3 className="mt-6 font-display text-lg text-ink">Slash commands registered</h3>
        <ul className="mt-2 space-y-1 font-body text-sm text-ink-soft">
          <li><code className="font-mono text-gold">/today</code> — today's marketing calendar + finance + catalogues</li>
          <li><code className="font-mono text-gold">/ask</code> — MiniMax-powered Q&amp;A over live MongoDB context</li>
          <li><code className="font-mono text-gold">/catalogue &lt;state&gt;</code> — render a state catalogue PDF on demand</li>
          <li><code className="font-mono text-gold">/artists [state]</code> — list discover artists</li>
          <li><code className="font-mono text-gold">/tenders</code> — list open government tenders</li>
        </ul>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Health({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="rounded-xl border border-stone/40 bg-linen p-3">
      <div className="flex items-center gap-2">
        <span
          className={
            "h-2 w-2 rounded-full " + (ok ? "bg-moss" : "bg-clay")
          }
        />
        <span className="font-body text-sm text-ink">{label}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-umber">{hint}</p>
    </div>
  );
}
