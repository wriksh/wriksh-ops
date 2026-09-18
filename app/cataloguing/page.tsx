import Link from "next/link";
import { listStates } from "@/lib/collections/states";
import { listRecentCatalogueJobs } from "@/lib/collections/catalogue";

/**
 * Cataloguing index.
 *
 * Lists every state in MongoDB with the latest render-job metadata. Click
 * a state to open the per-state catalogue editor (which in turn has a
 * "Generate PDF" button that hits the API route).
 */
export default async function CataloguingIndexPage() {
  const [states, jobs] = await Promise.all([
    listStates(),
    listRecentCatalogueJobs(200),
  ]);

  const lastJobByState = new Map<string, (typeof jobs)[number]>();
  for (const j of jobs) {
    if (!lastJobByState.has(j.stateSlug)) lastJobByState.set(j.stateSlug, j);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
            Cataloguing · Time
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            State catalogues from MongoDB
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            Each catalogue is rendered live from the wriksh cluster — states,
            traditions, festivals and providers come straight from MongoDB.
            Per-state intro copy and section ordering live in{" "}
            <code className="rounded bg-stone/30 px-1 font-mono text-xs">
              catalogue_overrides
            </code>
            .
          </p>
        </div>
        <div className="font-body text-xs text-umber">
          {states.length} states · {jobs.length} jobs tracked
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-stone/40">
        <table className="w-full font-body text-sm">
          <thead className="bg-forest text-left text-[11px] uppercase tracking-wider text-parchment/70">
            <tr>
              <th className="px-5 py-3 font-normal">State</th>
              <th className="px-5 py-3 font-normal">Region</th>
              <th className="px-5 py-3 font-normal">Tagline</th>
              <th className="px-5 py-3 font-normal">Last render</th>
              <th className="px-5 py-3 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {states.map((s) => {
              const last = lastJobByState.get(s.slug);
              return (
                <tr key={s.slug} className="border-b border-stone/30 last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/cataloguing/${s.slug}`}
                      className="font-display text-ink hover:text-gold"
                    >
                      {s.name}
                    </Link>
                    <div className="font-mono text-[11px] text-umber">{s.slug}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{s.region}</td>
                  <td className="px-5 py-3 max-w-xs text-ink-soft">
                    <span className="line-clamp-2">{s.tagline}</span>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {last ? (
                      <>
                        <div className="text-ink">
                          {new Date(last.generatedAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-umber">
                          {last.byteSize ? `${(last.byteSize / 1024).toFixed(0)} KB` : "—"}
                        </div>
                      </>
                    ) : (
                      <span className="italic text-umber">never</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/cataloguing/${s.slug}`}
                      className="inline-block rounded-full border border-gold px-3 py-1 font-body text-[11px] uppercase tracking-wider text-gold hover:bg-gold hover:text-linen"
                    >
                      Generate
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
