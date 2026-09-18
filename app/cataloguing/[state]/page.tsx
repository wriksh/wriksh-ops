import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogueGenerator from "@/components/cataloguing/CatalogueGenerator";
import { getStateBySlug } from "@/lib/collections/states";
import {
  getCatalogueOverride,
  listRecentCatalogueJobs,
} from "@/lib/collections/catalogue";
import { listTraditionsForState } from "@/lib/collections/traditions";
import { listProvidersForState } from "@/lib/collections/providers";
import { listFestivalsForState } from "@/lib/collections/festivals";

/**
 * Per-state catalogue editor.
 *
 * The page itself is server-rendered; it shows the data snapshot for the
 * state and then hands off to the client-side CatalogueGenerator for
 * triggering PDF renders.
 */
export default async function StateCataloguePage({
  params,
}: {
  params: { state: string };
}) {
  const stateSlug = params.state;
  const [state, override, recent, traditions, providers, festivals] =
    await Promise.all([
      getStateBySlug(stateSlug),
      getCatalogueOverride(stateSlug),
      listRecentCatalogueJobs(20),
      listTraditionsForState(stateSlug),
      listProvidersForState(stateSlug),
      listFestivalsForState(stateSlug),
    ]);

  if (!state) return notFound();

  const stateJobs = recent.filter((j) => j.stateSlug === stateSlug);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/cataloguing"
        className="inline-block font-body text-xs uppercase tracking-[0.24em] text-gold hover:text-gold-bright"
      >
        ← All states
      </Link>

      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
          Cataloguing · {state.region}
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">{state.name}</h1>
        <p className="mt-2 max-w-2xl font-body text-base italic text-gold">
          {state.tagline}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Traditions" value={traditions.length} />
        <Stat label="Providers" value={providers.length} />
        <Stat label="Festivals" value={festivals.length} />
        <Stat
          label="Has override"
          value={override ? "yes" : "no"}
          tone={override ? "moss" : "umber"}
        />
      </section>

      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h2 className="font-display text-xl text-ink">Generate the catalogue PDF</h2>
        <p className="mt-2 max-w-2xl font-body text-sm text-ink-soft">
          Renders an A4 PDF directly from the live MongoDB data — no manual
          file editing. The render is audit-logged in{" "}
          <code className="rounded bg-stone/30 px-1 font-mono text-xs">
            catalogue_jobs
          </code>
          .
        </p>
        <div className="mt-5">
          <CatalogueGenerator stateSlug={stateSlug} stateName={state.name} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h2 className="font-display text-xl text-ink">Render history</h2>
        {stateJobs.length === 0 ? (
          <p className="mt-3 font-body text-sm text-ink-soft">
            No renders yet for {state.name}. Click <em>Generate</em> above to
            create the first one.
          </p>
        ) : (
          <table className="mt-3 w-full font-body text-sm">
            <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
              <tr>
                <th className="py-2">When</th>
                <th className="py-2">By</th>
                <th className="py-2 text-right">Size</th>
                <th className="py-2 text-right">Notes</th>
              </tr>
            </thead>
            <tbody>
              {stateJobs.map((j, i) => (
                <tr key={i} className="border-b border-stone/20">
                  <td className="py-2 text-ink-soft">
                    {new Date(j.generatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-ink-soft">{j.generatedBy}</td>
                  <td className="py-2 text-right text-ink-soft">
                    {j.byteSize ? `${(j.byteSize / 1024).toFixed(0)} KB` : "—"}
                  </td>
                  <td className="py-2 text-right text-ink-soft">{j.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  tone?: "ink" | "moss" | "umber";
}) {
  const toneClass =
    tone === "moss" ? "text-moss" : tone === "umber" ? "text-umber" : "text-ink";
  return (
    <div className="rounded-2xl border border-stone/40 bg-parchment p-4">
      <div className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}
