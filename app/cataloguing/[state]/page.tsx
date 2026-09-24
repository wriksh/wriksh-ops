import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogueGenerator from "@/components/cataloguing/CatalogueGenerator";
import CatalogueTabs from "@/components/cataloguing/CatalogueTabs";
import { getStateBySlug } from "@/lib/collections/states";
import {
  getCatalogueOverride,
  listRecentCatalogueJobs,
} from "@/lib/collections/catalogue";
import { listTraditionsForState } from "@/lib/collections/traditions";
import { listProvidersForState } from "@/lib/collections/providers";
import { listFestivalsForState } from "@/lib/collections/festivals";
import { listExperiencesForState } from "@/lib/collections/experiences";
import { listLearnForState } from "@/lib/collections/learn";
import type {
  CatalogueJobDoc,
  CataloguePdfKind,
} from "@/lib/types";

/**
 * Per-state catalogue editor.
 *
 * Server-rendered, hands off to client components for tab switching and
 * PDF generation. Three tabs share this view:
 *   1. State Catalogue — the original multi-section PDF (cover, traditions,
 *      festivals, providers, closing) using the existing render path.
 *   2. Experiences — a per-experience spread PDF using real cover images.
 *   3. Learn — a per-course spread PDF with lead-teacher & cohort dates.
 *
 * Each tab keeps its own render-history table, filtered by `pdfKind`.
 */
export default async function StateCataloguePage({
  params,
}: {
  params: { state: string };
}) {
  const stateSlug = params.state;
  const [
    state,
    override,
    recent,
    traditions,
    providers,
    festivals,
    experiences,
    learns,
  ] = await Promise.all([
    getStateBySlug(stateSlug),
    getCatalogueOverride(stateSlug),
    listRecentCatalogueJobs(50),
    listTraditionsForState(stateSlug),
    listProvidersForState(stateSlug),
    listFestivalsForState(stateSlug),
    listExperiencesForState(stateSlug),
    listLearnForState(stateSlug),
  ]);

  if (!state) return notFound();

  // Split jobs by pdfKind; legacy rows (no pdfKind) count as state-catalogue.
  const stateJobs = recent.filter(
    (j) =>
      j.stateSlug === stateSlug &&
      (j.pdfKind === "state-catalogue" || j.pdfKind === undefined)
  );
  const experienceJobs = recent.filter(
    (j) => j.stateSlug === stateSlug && j.pdfKind === "experiences"
  );
  const learnJobs = recent.filter(
    (j) => j.stateSlug === stateSlug && j.pdfKind === "learn"
  );

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

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Traditions" value={traditions.length} />
        <Stat label="Providers" value={providers.length} />
        <Stat label="Festivals" value={festivals.length} />
        <Stat label="Experiences" value={experiences.length} />
        <Stat label="Learn" value={learns.length} />
      </section>

      <CatalogueTabs
        panels={{
          catalogue: (
            <CataloguePanel
              stateName={state.name}
              stateSlug={stateSlug}
              jobs={stateJobs}
              pdfKind="state-catalogue"
              eyebrow="STATE CATALOGUE"
              title="Generate the state catalogue PDF"
              description={
                <>
                  Renders the full multi-section A4 PDF directly from the
                  live MongoDB data — traditions, festivals, providers, all
                  stitched together with the override-controlled section
                  order. Audit-logged in{" "}
                  <code className="rounded bg-stone/30 px-1 font-mono text-xs">
                    catalogue_jobs
                  </code>{" "}
                  with{" "}
                  <code className="font-mono text-xs">
                    pdfKind=&quot;state-catalogue&quot;
                  </code>
                  .
                </>
              }
              emptyMessage={`No renders yet for ${state.name}. Click Generate to create the first one.`}
            />
          ),
          experiences: (
            <CataloguePanel
              stateName={state.name}
              stateSlug={stateSlug}
              jobs={experienceJobs}
              pdfKind="experiences"
              eyebrow="EXPERIENCES"
              title="Generate the experiences PDF"
              description={
                <>
                  One spread per published experience in {state.name}. Uses
                  the real{" "}
                  <code className="font-mono text-xs">coverImage</code> URLs
                  from each experience doc, plus story / schedule / includes
                  / FAQs / reviews.{" "}
                  {experiences.length === 0
                    ? "No experiences are published in this state yet — the PDF will render an empty-state welcome page."
                    : `${experiences.length} experience${experiences.length === 1 ? "" : "s"} will appear in this PDF.`}
                </>
              }
              emptyMessage={`No experiences renders yet for ${state.name}.`}
            />
          ),
          learn: (
            <CataloguePanel
              stateName={state.name}
              stateSlug={stateSlug}
              jobs={learnJobs}
              pdfKind="learn"
              eyebrow="LEARN"
              title="Generate the learn PDF"
              description={
                <>
                  One spread per published learn program in {state.name}.
                  Includes lead-teacher profile, cohort intake dates,
                  prerequisites, cancellation policy, and FAQs.{" "}
                  {learns.length === 0
                    ? "No learn programs are published in this state yet — the PDF will render an empty-state welcome page."
                    : `${learns.length} program${learns.length === 1 ? "" : "s"} will appear in this PDF.`}
                </>
              }
              emptyMessage={`No learn renders yet for ${state.name}.`}
            />
          ),
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CataloguePanel({
  stateName,
  stateSlug,
  jobs,
  pdfKind,
  eyebrow,
  title,
  description,
  emptyMessage,
}: {
  stateName: string;
  stateSlug: string;
  jobs: CatalogueJobDoc[];
  pdfKind: CataloguePdfKind;
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  emptyMessage: string;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <p className="font-body text-[10px] uppercase tracking-[0.32em] text-gold">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl text-ink">{title}</h2>
        <p className="mt-2 max-w-2xl font-body text-sm text-ink-soft">
          {description}
        </p>
        <div className="mt-5">
          <CatalogueGenerator
            stateSlug={stateSlug}
            stateName={stateName}
            pdfKind={pdfKind}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h3 className="font-display text-lg text-ink">Render history</h3>
        {jobs.length === 0 ? (
          <p className="mt-3 font-body text-sm text-ink-soft">{emptyMessage}</p>
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
              {jobs.map((j, i) => (
                <tr key={i} className="border-b border-stone/20">
                  <td className="py-2 text-ink-soft">
                    {new Date(j.generatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-ink-soft">{j.generatedBy}</td>
                  <td className="py-2 text-right text-ink-soft">
                    {j.byteSize
                      ? `${(j.byteSize / 1024).toFixed(0)} KB`
                      : "—"}
                  </td>
                  <td className="py-2 text-right text-ink-soft">
                    {j.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
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
