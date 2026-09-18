"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MARKETING_CATEGORY_COLOR,
  MARKETING_CATEGORY_LABELS,
  type MarketingCategory,
} from "@/lib/types";
import {
  ALL_CATEGORIES,
  EVENT_STATUSES,
} from "@/lib/collections/marketing-helpers";
import type { MarketingEventDoc } from "@/lib/types";

/**
 * /marketing client component.
 *
 * Renders:
 *   - Month selector with prev/next/today
 *   - 7-column month grid (Mon–Sun) with colour-coded event chips
 *   - Agenda list below the grid: chronological, status-filtered
 *   - Event editor modal (create / edit / delete)
 *
 * Server already filtered to this month; we keep an in-memory copy so
 * CRUD operations feel instant, then revalidate.
 */
export default function MarketingClient({
  monthDate,
  events,
}: {
  monthDate: string;
  events: MarketingEventDoc[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [eventsState, setEventsState] = useState<MarketingEventDoc[]>(events);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [filter, setFilter] = useState<MarketingCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<MarketingEventDoc> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const month = useMemo(() => new Date(monthDate), [monthDate]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(month),
    [month]
  );

  // Build the grid: array of weeks, each week is array of YYYY-MM-DD strings.
  const grid = useMemo(() => buildMonthGrid(month), [month]);

  // Apply client-side filters for the agenda view.
  const visible = useMemo(() => {
    return eventsState.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (statusFilter !== "all" && (e.status ?? "planned") !== statusFilter) return false;
      return true;
    });
  }, [eventsState, filter, statusFilter]);

  // Index events by day for the grid.
  const byDay = useMemo(() => {
    const m = new Map<string, MarketingEventDoc[]>();
    for (const e of eventsState) {
      const day = e.date.slice(0, 10); // YYYY-MM-DD
      const list = m.get(day) ?? [];
      list.push(e);
      m.set(day, list);
    }
    return m;
  }, [eventsState]);

  function startNew(initialDate?: string) {
    setEditing({
      title: "",
      category: "post",
      date: initialDate ?? new Date().toISOString().slice(0, 10),
      status: "planned",
      channel: "",
      owner: "",
      notes: "",
    });
    setError(null);
  }

  function startEdit(e: MarketingEventDoc) {
    setEditing({ ...e });
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing._id;
      const url = isCreate ? "/api/marketing/events" : `/api/marketing/events/${editing._id}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      // Optimistic local update; also revalidate the server data.
      if (isCreate) {
        setEventsState((prev) => [...prev, data.event].sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        setEventsState((prev) => prev.map((e) => (e._id === data.event._id ? data.event : e)));
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/marketing/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setEventsState((prev) => prev.filter((e) => e._id !== id));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function navigateMonth(delta: number) {
    const d = new Date(month);
    d.setUTCMonth(d.getUTCMonth() + delta);
    const ymd = d.toISOString().slice(0, 7);
    router.push(`/marketing?month=${ymd}`);
  }

  function jumpToday() {
    const t = new Date();
    router.push(`/marketing?month=${t.toISOString().slice(0, 7)}`);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      {/* ---- Toolbar ---------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone/40 bg-parchment p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="rounded-full border border-stone/60 px-3 py-1 font-body text-xs hover:bg-linen"
          >
            ←
          </button>
          <button
            type="button"
            onClick={jumpToday}
            className="rounded-full border border-stone/60 px-3 py-1 font-body text-xs hover:bg-linen"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="rounded-full border border-stone/60 px-3 py-1 font-body text-xs hover:bg-linen"
          >
            →
          </button>
          <span className="ml-3 font-display text-2xl text-ink">{monthLabel}</span>
          <span className="ml-2 font-body text-xs text-umber">
            {visible.length} event{visible.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as MarketingCategory | "all")}
            className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MARKETING_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
          >
            <option value="all">All statuses</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-full border border-stone/40">
            <button
              type="button"
              onClick={() => setView("month")}
              className={
                "px-3 py-1 font-body text-[11px] uppercase tracking-wider " +
                (view === "month" ? "bg-gold text-linen" : "bg-linen text-ink-soft")
              }
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className={
                "px-3 py-1 font-body text-[11px] uppercase tracking-wider " +
                (view === "agenda" ? "bg-gold text-linen" : "bg-linen text-ink-soft")
              }
            >
              Agenda
            </button>
          </div>
          <button
            type="button"
            onClick={() => startNew()}
            className="rounded-full bg-gold px-4 py-1 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright"
          >
            + Add event
          </button>
        </div>
      </div>

      {/* ---- Colour legend ---------------------------------------- */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-stone/40 bg-linen p-3">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(filter === c ? "all" : c)}
            className={
              "flex items-center gap-2 rounded-full border px-3 py-1 font-body text-[11px] uppercase tracking-wider transition " +
              (filter === c
                ? "border-ink bg-ink text-linen"
                : "border-stone/40 text-ink-soft hover:border-gold")
            }
          >
            <span className={`h-3 w-3 rounded-full ${MARKETING_CATEGORY_COLOR[c]}`} />
            {MARKETING_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* ---- Month grid ------------------------------------------ */}
      {view === "month" ? (
        <div className="overflow-hidden rounded-2xl border border-stone/40">
          <div className="grid grid-cols-7 border-b border-stone/40 bg-forest text-[11px] uppercase tracking-wider text-parchment/70">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-3 py-2 font-body">
                {d}
              </div>
            ))}
          </div>
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-stone/30 last:border-b-0">
              {week.map((day) => {
                const dayEvents = (byDay.get(day.ymd) ?? []).filter(
                  (e) => filter === "all" || e.category === filter
                );
                const isToday = day.ymd === new Date().toISOString().slice(0, 10);
                return (
                  <button
                    type="button"
                    key={day.ymd}
                    onClick={() => startNew(day.ymd)}
                    className={
                      "group relative flex min-h-[88px] flex-col items-start gap-1 border-r border-stone/30 p-2 text-left transition last:border-r-0 " +
                      (day.inMonth ? "bg-parchment" : "bg-linen/60 text-umber") +
                      (isToday ? " ring-2 ring-inset ring-gold" : "")
                    }
                  >
                    <span className="font-body text-[11px] text-umber">
                      {Number(day.label)}
                    </span>
                    <div className="flex w-full flex-col gap-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e._id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            startEdit(e);
                          }}
                          className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 font-body text-[10px] text-linen ${MARKETING_CATEGORY_COLOR[e.category]}`}
                          title={e.title}
                        >
                          <span className="truncate">{e.title}</span>
                        </span>
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="font-body text-[10px] text-umber">
                          +{dayEvents.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      {/* ---- Agenda list ----------------------------------------- */}
      {view === "agenda" ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment">
          {visible.length === 0 ? (
            <p className="p-6 font-body text-sm text-ink-soft">
              No events match the current filters.
            </p>
          ) : (
            <table className="w-full font-body text-sm">
              <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e._id} className="border-b border-stone/30 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-umber">
                      {e.date.slice(0, 10)}
                      {e.endDate ? ` → ${e.endDate.slice(0, 10)}` : ""}
                    </td>
                    <td className="px-4 py-3 font-display text-ink">{e.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-linen ${MARKETING_CATEGORY_COLOR[e.category]}`}
                      >
                        {MARKETING_CATEGORY_LABELS[e.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider " +
                          statusPillClass(e.status ?? "planned")
                        }
                      >
                        {e.status ?? "planned"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.owner ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.channel ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(e)}
                        className="mr-2 font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => e._id && remove(e._id)}
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
        </div>
      ) : null}

      {/* ---- Editor modal ----------------------------------------- */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
            <h3 className="font-display text-2xl text-ink">
              {editing._id ? "Edit event" : "New event"}
            </h3>
            <div className="mt-4 space-y-3">
              <Field label="Title">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.category ?? "post"}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value as MarketingCategory })
                    }
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {MARKETING_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.status ?? "planned"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as MarketingEventDoc["status"] })}
                  >
                    {EVENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    type="date"
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={(editing.date ?? "").slice(0, 10)}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </Field>
                <Field label="End date (optional)">
                  <input
                    type="date"
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={(editing.endDate ?? "").slice(0, 10)}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Owner">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.owner ?? ""}
                    onChange={(e) => setEditing({ ...editing, owner: e.target.value })}
                  />
                </Field>
                <Field label="Channel">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    placeholder="Instagram / Discord / Newsletter"
                    value={editing.channel ?? ""}
                    onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <textarea
                  className="h-24 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

type DayCell = { ymd: string; label: string; inMonth: boolean };

function buildMonthGrid(monthStart: Date): DayCell[][] {
  const first = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1));
  // JS getUTCDay: 0 = Sun, 1 = Mon, ..., 6 = Sat. We want Monday-first.
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const cells: DayCell[] = [];
  // Leading days from previous month
  for (let i = 0; i < firstWeekday; i += 1) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() - (firstWeekday - i));
    cells.push(toCell(d, false));
  }
  // In-month days
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dt = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d));
    cells.push(toCell(dt, true));
  }
  // Trailing days
  while (cells.length % 7 !== 0) {
    const last = new Date(cells[cells.length - 1].ymd + "T00:00:00Z");
    last.setUTCDate(last.getUTCDate() + 1);
    cells.push(toCell(last, false));
  }
  // Pad to 6 weeks for stable height
  while (cells.length < 42) {
    const last = new Date(cells[cells.length - 1].ymd + "T00:00:00Z");
    last.setUTCDate(last.getUTCDate() + 1);
    cells.push(toCell(last, false));
  }
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function toCell(d: Date, inMonth: boolean): DayCell {
  const ymd = d.toISOString().slice(0, 10);
  const label = String(d.getUTCDate()).padStart(2, "0");
  return { ymd, label, inMonth };
}

function statusPillClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-moss/20 text-moss";
    case "live":
      return "bg-gold/20 text-gold";
    case "cancelled":
      return "bg-clay/20 text-clay";
    default:
      return "bg-stone/40 text-umber";
  }
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
