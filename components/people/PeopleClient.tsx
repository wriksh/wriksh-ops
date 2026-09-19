"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PersonDoc, PersonRole } from "@/lib/types";

const ROLE_META: Record<PersonRole, { label: string; tone: string; icon: string }> = {
  artist: { label: "Artist", tone: "bg-rust/20 text-rust", icon: "🎭" },
  guide: { label: "Guide", tone: "bg-moss/20 text-moss", icon: "🗺" },
  host: { label: "Host", tone: "bg-gold/20 text-gold", icon: "🪔" },
  government: { label: "Government", tone: "bg-forest text-linen", icon: "🏛" },
  vendor: { label: "Vendor", tone: "bg-umber/20 text-umber", icon: "📦" },
  team: { label: "Team", tone: "bg-stone/40 text-umber", icon: "👥" },
};

const ALL_ROLES: PersonRole[] = [
  "artist",
  "guide",
  "host",
  "government",
  "vendor",
  "team",
];

/**
 * /people client component.
 *
 * Top: KPI strip (counts per role) + search + role tabs.
 * Body: filtered + sorted card grid.
 * Side: editor modal (create / edit / delete).
 */
export default function PeopleClient({
  people,
  counts,
  initialQuery,
  initialRole,
  initialTag,
  initialState,
}: {
  people: PersonDoc[];
  counts: Record<PersonRole, number>;
  initialQuery: string;
  initialRole: string;
  initialTag: string;
  initialState: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initialQuery);
  const [role, setRole] = useState<PersonRole | "all">(
    (initialRole as PersonRole) || "all"
  );
  const [tag, setTag] = useState(initialTag);
  const [stateFilter, setStateFilter] = useState(initialState);
  const [editing, setEditing] = useState<PersonDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered view
  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return people.filter((p) => {
      if (role !== "all" && !p.roles.includes(role)) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (stateFilter && p.stateSlug !== stateFilter) return false;
      if (ql) {
        const hay = `${p.name} ${p.slug} ${p.city ?? ""} ${p.bio ?? ""} ${(p.tags ?? []).join(" ")} ${(p.artForms ?? []).join(" ")} ${(p.languages ?? []).join(" ")} ${p.contact?.email ?? ""} ${p.contact?.phone ?? ""}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [people, q, role, tag, stateFilter]);

  // Top tags + states from current data (live updates as the data changes)
  const topTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of people) for (const t of p.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([t]) => t);
  }, [people]);

  const topStates = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of people) if (p.stateSlug) m.set(p.stateSlug, (m.get(p.stateSlug) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [people]);

  function startNew() {
    setEditing({
      slug: "",
      name: "",
      roles: ["artist"],
      tags: [],
      stateSlug: "",
      city: "",
      bio: "",
      contact: {},
      status: "published",
    } as PersonDoc);
    setError(null);
  }

  function startEdit(p: PersonDoc) {
    setEditing({ ...p });
    setError(null);
  }

  function updateUrl(next: Partial<{ q: string; role: string; tag: string; state: string }>) {
    const params = new URLSearchParams();
    const fq = next.q ?? q;
    const fr = next.role ?? (role === "all" ? "" : role);
    const ft = next.tag ?? tag;
    const fs = next.state ?? stateFilter;
    if (fq) params.set("q", fq);
    if (fr) params.set("role", fr);
    if (ft) params.set("tag", ft);
    if (fs) params.set("state", fs);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/people?${qs}` : `/people`));
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = !editing._id;
      const url = isCreate ? "/api/people" : `/api/people/${encodeURIComponent(editing.slug)}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setEditing(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: PersonDoc) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/people/${encodeURIComponent(p.slug)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-rust">
            Pillar of Energy
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">People</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            One contact database for artists, guides, learn hosts,
            government contacts, vendors, and the team. Search by name,
            tag, state, art form, or language.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-gold-bright"
        >
          + Add person
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      {/* Role KPI strip + tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setRole("all");
            updateUrl({ role: "" });
          }}
          className={
            "rounded-full px-4 py-2 font-body text-[11px] uppercase tracking-wider transition " +
            (role === "all"
              ? "bg-forest text-linen"
              : "border border-stone/40 text-ink-soft hover:border-gold")
          }
        >
          All · {totalCount}
        </button>
        {ALL_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r);
              updateUrl({ role: r });
            }}
            className={
              "flex items-center gap-2 rounded-full px-4 py-2 font-body text-[11px] uppercase tracking-wider transition " +
              (role === r
                ? "bg-forest text-linen"
                : "border border-stone/40 text-ink-soft hover:border-gold")
            }
          >
            <span aria-hidden>{ROLE_META[r].icon}</span>
            {ROLE_META[r].label} · {counts[r]}
          </button>
        ))}
      </div>

      {/* Toolbar: search + state + tags */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone/40 bg-parchment p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search name, tag, city, email, art form…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              updateUrl({ q: e.target.value });
            }}
            className="min-w-[260px] flex-1 rounded border border-stone/40 bg-linen px-3 py-2 font-body text-sm"
          />
          {topStates.length > 0 ? (
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                updateUrl({ state: e.target.value });
              }}
              className="rounded border border-stone/40 bg-linen px-2 py-2 font-body text-xs"
            >
              <option value="">All states</option>
              {topStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : null}
          {tag ? (
            <button
              type="button"
              onClick={() => {
                setTag("");
                updateUrl({ tag: "" });
              }}
              className="rounded-full border border-clay px-3 py-1 font-body text-[11px] uppercase tracking-wider text-clay hover:bg-clay hover:text-linen"
            >
              ✕ Tag: {tag}
            </button>
          ) : null}
        </div>
        {topTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const next = tag === t ? "" : t;
                  setTag(next);
                  updateUrl({ tag: next });
                }}
                className={
                  "rounded-full px-3 py-1 font-body text-[10px] uppercase tracking-wider transition " +
                  (tag === t
                    ? "border border-ink bg-ink text-linen"
                    : "border border-stone/40 text-ink-soft hover:border-gold hover:text-gold")
                }
              >
                #{t}
              </button>
            ))}
          </div>
        ) : null}
        <p className="font-body text-xs text-umber">
          {visible.length} {visible.length === 1 ? "person" : "people"}
          {q ? ` matching "${q}"` : ""}
          {tag ? ` tagged #${tag}` : ""}
          {stateFilter ? ` in ${stateFilter}` : ""}
        </p>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-8 text-center font-body text-sm text-ink-soft">
          No people match the current filters. Try widening the role tabs or clearing the search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <PersonCard
              key={p.slug}
              person={p}
              onEdit={() => startEdit(p)}
              onDelete={() => remove(p)}
            />
          ))}
        </div>
      )}

      {editing ? (
        <PersonEditorModal
          person={editing}
          busy={busy}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function PersonCard({
  person,
  onEdit,
  onDelete,
}: {
  person: PersonDoc;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = person.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="group flex flex-col rounded-2xl border border-stone/40 bg-parchment p-5 shadow-card transition hover:border-gold/60 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest font-display text-lg text-linen">
          {initials || "•"}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {person.roles.map((r) => (
            <span
              key={r}
              className={`rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider ${ROLE_META[r].tone}`}
            >
              {ROLE_META[r].icon} {ROLE_META[r].label}
            </span>
          ))}
        </div>
      </div>
      <Link
        href={`/people/${person.slug}`}
        className="mt-3 font-display text-lg leading-tight text-ink hover:text-gold"
      >
        {person.name}
      </Link>
      <p className="mt-1 font-body text-xs text-umber">
        {person.stateSlug ?? "—"}
        {person.city ? ` · ${person.city}` : ""}
      </p>
      {person.bio ? (
        <p className="mt-2 line-clamp-2 font-body text-xs text-ink-soft">{person.bio}</p>
      ) : null}
      {(person.artForms?.length ?? 0) > 0 ? (
        <p className="mt-2 font-body text-[10px] text-umber">
          🎭 {person.artForms!.slice(0, 3).join(", ")}
          {person.artForms!.length > 3 ? ` +${person.artForms!.length - 3}` : ""}
        </p>
      ) : null}
      {(person.tags ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {person.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] text-umber"
            >
              #{t}
            </span>
          ))}
          {person.tags.length > 6 ? (
            <span className="font-body text-[10px] text-umber">+{person.tags.length - 6}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone/30 pt-3">
        <ContactIcons person={person} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="font-body text-[11px] uppercase tracking-wider text-gold hover:text-gold-bright"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactIcons({ person }: { person: PersonDoc }) {
  const c = person.contact ?? {};
  return (
    <div className="flex items-center gap-2 font-body text-[11px] text-umber">
      {c.phone ? (
        <a href={`tel:${c.phone}`} className="hover:text-gold" title={c.phone}>
          📞
        </a>
      ) : null}
      {c.email ? (
        <a href={`mailto:${c.email}`} className="hover:text-gold" title={c.email}>
          ✉
        </a>
      ) : null}
      {c.website ? (
        <a
          href={c.website}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold"
          title={c.website}
        >
          🌐
        </a>
      ) : null}
      {!c.phone && !c.email && !c.website ? (
        <span className="italic text-umber">no contact</span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor modal
// ---------------------------------------------------------------------------

const EMPTY_ROLES: PersonRole[] = [];

function PersonEditorModal({
  person,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  person: PersonDoc;
  busy: boolean;
  onChange: (p: PersonDoc) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const tagsString = (person.tags ?? []).join(", ");
  const roles = person.roles ?? EMPTY_ROLES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-stone/40 bg-linen p-6 shadow-card">
        <h3 className="font-display text-2xl text-ink">
          {person._id ? `Edit ${person.name}` : "New person"}
        </h3>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input
              className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
              value={person.name ?? ""}
              onChange={(e) => onChange({ ...person, name: e.target.value })}
            />
          </Field>
          <Field label="Slug (URL — leave blank to auto-generate)">
            <input
              className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
              placeholder="jagadeesh-naik"
              value={person.slug ?? ""}
              onChange={(e) => onChange({ ...person, slug: e.target.value })}
              disabled={!!person._id}
            />
          </Field>

          <Field label="Roles (one or many)">
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => {
                const checked = roles.includes(r);
                return (
                  <label
                    key={r}
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
                        const next = new Set(roles);
                        if (e.target.checked) next.add(r);
                        else next.delete(r);
                        onChange({ ...person, roles: Array.from(next) });
                      }}
                    />
                    {ROLE_META[r].icon} {ROLE_META[r].label}
                  </label>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="State slug">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                value={person.stateSlug ?? ""}
                onChange={(e) => onChange({ ...person, stateSlug: e.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                value={person.city ?? ""}
                onChange={(e) => onChange({ ...person, city: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Tags (comma-separated — state, art forms, languages, …)">
            <input
              className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
              value={tagsString}
              onChange={(e) =>
                onChange({
                  ...person,
                  tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="karnataka, yakshagana, kannada"
            />
          </Field>

          {(roles.includes("artist") || roles.includes("guide")) ? (
            <Field label="Art forms (artist/guide)">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                value={(person.artForms ?? []).join(", ")}
                onChange={(e) =>
                  onChange({
                    ...person,
                    artForms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </Field>
          ) : null}

          {(roles.includes("guide")) ? (
            <Field label="Languages (guide)">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                value={(person.languages ?? []).join(", ")}
                onChange={(e) =>
                  onChange({
                    ...person,
                    languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="English, Kannada, Hindi"
              />
            </Field>
          ) : null}

          {roles.includes("host") ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Host type">
                <select
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={person.hostType ?? "ttc"}
                  onChange={(e) =>
                    onChange({
                      ...person,
                      hostType: e.target.value as NonNullable<PersonDoc["hostType"]>,
                    })
                  }
                >
                  <option value="ttc">TTC</option>
                  <option value="csr">CSR</option>
                  <option value="apprenticeship">Apprenticeship</option>
                  <option value="workshop">Workshop</option>
                </select>
              </Field>
              <Field label="Duration">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  placeholder="21 days residential"
                  value={person.duration ?? ""}
                  onChange={(e) => onChange({ ...person, duration: e.target.value })}
                />
              </Field>
              <Field label="Fee (INR)">
                <input
                  type="number"
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  value={person.feeINR ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...person,
                      feeINR: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Art form (host)">
                <input
                  className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
                  placeholder="Kalaripayattu"
                  value={person.artForm ?? ""}
                  onChange={(e) => onChange({ ...person, artForm: e.target.value })}
                />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Phone">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                value={person.contact?.phone ?? ""}
                onChange={(e) =>
                  onChange({
                    ...person,
                    contact: { ...person.contact, phone: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                value={person.contact?.email ?? ""}
                onChange={(e) =>
                  onChange({
                    ...person,
                    contact: { ...person.contact, email: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Website">
              <input
                className="w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm font-mono"
                value={person.contact?.website ?? ""}
                onChange={(e) =>
                  onChange({
                    ...person,
                    contact: { ...person.contact, website: e.target.value },
                  })
                }
              />
            </Field>
          </div>

          <Field label="Bio">
            <textarea
              className="h-24 w-full rounded border border-stone/40 bg-parchment px-3 py-2 font-body text-sm"
              value={person.bio ?? ""}
              onChange={(e) => onChange({ ...person, bio: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone/60 px-4 py-2 font-body text-[11px] uppercase tracking-wider text-umber hover:bg-parchment"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="rounded-full bg-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
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
