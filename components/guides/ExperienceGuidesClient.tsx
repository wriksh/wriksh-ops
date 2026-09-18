"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceGuideDoc } from "@/lib/types";

/**
 * /experience-guides — Phase 6 admin console.
 * CRUD for local trip leaders / curators who can lead a Wriksh Experience.
 */
export default function ExperienceGuidesClient({
  initialGuides,
}: {
  initialGuides: ExperienceGuideDoc[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [guides, setGuides] = useState<ExperienceGuideDoc[]>(initialGuides);
  const [editing, setEditing] = useState<ExperienceGuideDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditing({
      slug: "",
      name: "",
      stateSlug: "karnataka",
      city: "",
      experiences: [],
      languages: ["English"],
      status: "published",
      contact: {},
    } as ExperienceGuideDoc);
    setError(null);
  }

  function startEdit(g: ExperienceGuideDoc) {
    setEditing({ ...g });
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing._id;
      const url = isCreate
        ? "/api/experience-guides/guide"
        : `/api/experience-guides/guide/${editing.slug}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      if (isCreate) setGuides((prev) => [...prev, data.guide]);
      else setGuides((prev) => prev.map((g) => (g.slug === data.guide.slug ? data.guide : g)));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete guide "${slug}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/experience-guides/guide/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setGuides((prev) => prev.filter((g) => g.slug !== slug));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-moss">
            Phase 6a  ·  Pillar of Energy
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Experience guides</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            Local guides, curators, and trip leaders who can lead a Wriksh
            Experience in their home state. Each guide is tied to a state
            and a list of experiences they can run.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-gold-bright"
        >
          + Add guide
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-stone/40">
        <table className="w-full font-body text-sm">
          <thead className="bg-forest text-left text-[11px] uppercase tracking-wider text-parchment/70">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">State / City</th>
              <th className="px-4 py-3">Languages</th>
              <th className="px-4 py-3">Experiences</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {guides.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center font-body text-sm text-ink-soft">
                  No guides yet. Click <em>+ Add guide</em> to create the first.
                </td>
              </tr>
            ) : null}
            {guides.map((g) => (
              <tr key={g.slug} className="border-b border-stone/30 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-display text-ink">{g.name}</div>
                  <div className="font-mono text-[11px] text-umber">{g.slug}</div>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {g.stateSlug}
                  {g.city ? ` · ${g.city}` : ""}
                </td>
                <td className="px-4 py-3 text-ink-soft">{(g.languages ?? []).join(", ")}</td>
                <td className="px-4 py-3 text-ink-soft">
                  <div className="line-clamp-2">{(g.experiences ?? []).join(" · ")}</div>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {g.rating != null ? `★ ${g.rating.toFixed(1)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => startEdit(g)}
                    className="mr-2 font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g.slug)}
                    className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
            <h3 className="font-display text-2xl text-ink">
              {editing.slug ? `Edit ${editing.slug}` : "New guide"}
            </h3>
            <div className="mt-4 space-y-3">
              <Field label="Slug (URL)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                  placeholder="ravi-iyer-karnataka"
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  disabled={!!editing._id}
                />
              </Field>
              <Field label="Name">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State slug">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.stateSlug ?? ""}
                    onChange={(e) => setEditing({ ...editing, stateSlug: e.target.value })}
                  />
                </Field>
                <Field label="City">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Languages (comma-separated)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={(editing.languages ?? []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Experiences (one per line)">
                <textarea
                  className="h-24 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={(editing.experiences ?? []).join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      experiences: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Bio">
                <textarea
                  className="h-20 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={editing.bio ?? ""}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating (0-5)">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                    value={editing.rating ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        rating: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Contact phone">
                  <input
                    className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                    value={editing.contact?.phone ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        contact: { ...editing.contact, phone: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
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
