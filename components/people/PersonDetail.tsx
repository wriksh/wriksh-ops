import Link from "next/link";
import type { PersonDoc, MarketingEventDoc } from "@/lib/types";
import {
  MARKETING_CATEGORY_LABELS,
  MARKETING_CATEGORY_COLOR,
  type MarketingCategory,
} from "@/lib/types";

const fmtINR = new Intl.NumberFormat("en-IN");

/**
 * /people/[slug] — read-only detail view with an "Edit" button that
 * takes you back to the list (where the editor lives). Lists:
 *   - Contact card (phone / email / website)
 *   - Bio
 *   - Role-specific block (artist quotations + ratings, host schedule,
 *     guide experiences)
 *   - Tags
 *   - Recent marketing events mentioning this person (by slug match)
 */
export default function PersonDetail({
  person,
  events,
}: {
  person: PersonDoc;
  events: MarketingEventDoc[];
}) {
  const matchedEvents = events.filter((e) =>
    (e.notes ?? "").toLowerCase().includes(person.slug.toLowerCase()) ||
    person.tags.some((t) => (e.notes ?? "").toLowerCase().includes(t.toLowerCase()))
  );

  const avgRating =
    person.ratings?.length
      ? person.ratings.reduce((s, r) => s + r.score, 0) / person.ratings.length
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone/40 bg-parchment p-6 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest font-display text-2xl text-linen">
            {person.name
              .split(/\s+/)
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {person.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-gold/20 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-gold"
                >
                  {r}
                </span>
              ))}
            </div>
            <h1 className="mt-2 font-display text-3xl text-ink">{person.name}</h1>
            <p className="mt-1 font-body text-sm text-umber">
              {person.stateSlug ?? "—"}
              {person.city ? ` · ${person.city}` : ""}
              {person.hostType ? ` · ${person.hostType}` : ""}
            </p>
            {person.bio ? (
              <p className="mt-4 max-w-3xl font-body text-sm text-ink-soft">{person.bio}</p>
            ) : null}
          </div>
          <Link
            href={`/people?role=${person.roles[0] ?? ""}`}
            className="self-start rounded-full border border-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-gold hover:bg-gold hover:text-linen"
          >
            ← Back to People
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone/30 pt-4">
          <a
            href={`/people/${person.slug}/edit`}
            className="rounded-full bg-forest px-4 py-1.5 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-clay"
          >
            Edit
          </a>
          {person.contact?.phone ? (
            <a
              href={`tel:${person.contact.phone}`}
              className="rounded-full border border-stone/40 bg-linen px-4 py-1.5 font-body text-xs hover:border-gold"
            >
              📞 {person.contact.phone}
            </a>
          ) : null}
          {person.contact?.email ? (
            <a
              href={`mailto:${person.contact.email}`}
              className="rounded-full border border-stone/40 bg-linen px-4 py-1.5 font-body text-xs hover:border-gold"
            >
              ✉ {person.contact.email}
            </a>
          ) : null}
          {person.contact?.website ? (
            <a
              href={person.contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone/40 bg-linen px-4 py-1.5 font-body text-xs hover:border-gold"
            >
              🌐 Website
            </a>
          ) : null}
        </div>
      </div>

      {/* Tags */}
      {person.tags.length > 0 ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-5">
          <h2 className="font-display text-lg text-ink">Tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {person.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-stone/40 px-3 py-1 font-body text-xs text-umber"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Role-specific blocks */}
      {person.roles.includes("artist") ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-5">
          <h2 className="font-display text-lg text-ink">Artist details</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {person.artForms?.length ? (
              <Info label="Art forms" value={person.artForms.join(", ")} />
            ) : null}
            {person.priceRange ? (
              <Info
                label="Price range"
                value={`₹${fmtINR.format(person.priceRange.min)} – ₹${fmtINR.format(person.priceRange.max)}`}
              />
            ) : null}
            {avgRating != null ? (
              <Info label="Average rating" value={`★ ${avgRating.toFixed(1)} (${person.ratings!.length})`} />
            ) : null}
          </div>
          {person.quotations?.length ? (
            <div className="mt-4">
              <h3 className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
                Recent quotations
              </h3>
              <ul className="mt-2 space-y-1 font-body text-xs text-ink-soft">
                {person.quotations.slice(-5).map((q, i) => (
                  <li key={i}>
                    {new Date(q.receivedAt).toLocaleDateString()} — ₹
                    {fmtINR.format(q.amount)}
                    {q.note ? ` · ${q.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {person.roles.includes("guide") ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-5">
          <h2 className="font-display text-lg text-ink">Guide details</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {person.languages?.length ? (
              <Info label="Languages" value={person.languages.join(", ")} />
            ) : null}
            {person.certifications?.length ? (
              <Info label="Certifications" value={person.certifications.join(", ")} />
            ) : null}
            {person.rating != null ? (
              <Info label="Guide rating" value={`★ ${person.rating.toFixed(1)}`} />
            ) : null}
          </div>
          {person.experiences?.length ? (
            <div className="mt-4">
              <h3 className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
                Experiences they can lead
              </h3>
              <ul className="mt-2 space-y-1 font-body text-xs text-ink-soft">
                {person.experiences.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {person.roles.includes("host") ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-5">
          <h2 className="font-display text-lg text-ink">Host details</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {person.hostType ? <Info label="Host type" value={person.hostType.toUpperCase()} /> : null}
            {person.duration ? <Info label="Duration" value={person.duration} /> : null}
            {person.feeINR != null ? (
              <Info label="Fee" value={`₹${fmtINR.format(person.feeINR)}`} />
            ) : null}
            {person.artForm ? <Info label="Art form" value={person.artForm} /> : null}
          </div>
          {person.description ? (
            <p className="mt-4 font-body text-sm text-ink-soft">{person.description}</p>
          ) : null}
          {person.prerequisites ? (
            <p className="mt-2 font-body text-xs italic text-umber">
              Prerequisites: {person.prerequisites}
            </p>
          ) : null}
        </div>
      ) : null}

      {person.verifiedNote ? (
        <div className="rounded-2xl border border-moss/30 bg-moss/5 p-5">
          <h2 className="font-body text-[10px] uppercase tracking-[0.28em] text-moss">
            Verified by Wriksh
          </h2>
          <p className="mt-2 font-body text-sm text-ink">{person.verifiedNote}</p>
        </div>
      ) : null}

      {/* Recent marketing events mentioning this person */}
      {matchedEvents.length > 0 ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-5">
          <h2 className="font-display text-lg text-ink">Recent activity</h2>
          <ul className="mt-3 space-y-2">
            {matchedEvents.slice(0, 10).map((e) => (
              <li key={e._id ?? e.title} className="flex items-start gap-3 font-body text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-linen ${MARKETING_CATEGORY_COLOR[e.category as MarketingCategory] ?? "bg-stone"}`}
                >
                  {MARKETING_CATEGORY_LABELS[e.category as MarketingCategory] ?? e.category}
                </span>
                <div className="flex-1">
                  <span className="text-ink">{e.title}</span>
                  <span className="ml-2 font-mono text-[10px] text-umber">{e.date?.slice(0, 10)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
        {label}
      </dt>
      <dd className="mt-1 font-body text-sm text-ink">{value}</dd>
    </div>
  );
}
