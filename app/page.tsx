import { KpiTile } from "@/components/dashboard/KpiTile";
import CalendarLegend from "@/components/dashboard/CalendarLegend";
import { listStates } from "@/lib/collections/states";
import { listRecentCatalogueJobs } from "@/lib/collections/catalogue";
import { countMarketingEventsByCategory } from "@/lib/collections/marketing";
import { summariseFinance } from "@/lib/collections/finance";
import { countArtists, countTenders } from "@/lib/collections/artists";
import { countExperienceGuides, countLearnHosts } from "@/lib/collections/experienceGuides";
import { countMediaAssets } from "@/lib/collections/media";
import { listTraditionsForState } from "@/lib/collections/traditions";
import { listProvidersForState } from "@/lib/collections/providers";
import { listFestivalsForState } from "@/lib/collections/festivals";
import Link from "next/link";

/**
 * Dhoomkethu — the Wriksh ops dashboard.
 *
 * Each KPI pulls live MongoDB counts and renders into the colour-coded
 * tile grid. The chronology of Wriksh (past / present / future marketing
 * events) sits below as a colour legend.
 */
export default async function DhoomkethuPage() {
  const [
    states,
    recentJobs,
    marketingCounts,
    finance,
    artists,
    tenders,
    guides,
    hosts,
    media,
    karnatakaTraditions,
    karnatakaProviders,
    karnatakaFestivals,
  ] = await Promise.all([
    listStates(),
    listRecentCatalogueJobs(5),
    countMarketingEventsByCategory(),
    summariseFinance(),
    countArtists(),
    countTenders(),
    countExperienceGuides(),
    countLearnHosts(),
    countMediaAssets(),
    listTraditionsForState("karnataka").catch(() => []),
    listProvidersForState("karnataka").catch(() => []),
    listFestivalsForState("karnataka").catch(() => []),
  ]);

  const fmtINR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const totalMarketingEvents = Object.values(marketingCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
            Project Dhoomkethu
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            The Wriksh operations console
          </h1>
          <p className="mt-3 max-w-xl font-body text-sm text-ink-soft">
            A live snapshot of every Wriksh operation — catalogue pipeline,
            marketing calendar, finance, artists, and media — driven directly
            from MongoDB. Each tile below reflects the state of the world
            right now.
          </p>
        </div>
        <Link
          href="/cataloguing"
          className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-gold-bright"
        >
          Open Cataloguing →
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="States · UTs" value={states.length} sub="in the catalogue pipeline" tone="gold" href="/cataloguing" />
        <KpiTile label="Catalogues rendered" value={recentJobs.length} sub={`last: ${recentJobs[0]?.stateSlug ?? "—"}`} tone="forest" href="/cataloguing" />
        <KpiTile label="Marketing events" value={totalMarketingEvents} sub={`${marketingCounts.post} posts · ${marketingCounts.meeting} meetings`} tone="clay" href="/marketing" />
        <KpiTile
          label="Finance · this month"
          value={`₹${fmtINR.format(finance.thisMonth.net)}`}
          sub={`in ₹${fmtINR.format(finance.thisMonth.income)} · out ₹${fmtINR.format(finance.thisMonth.expense)}`}
          tone={finance.thisMonth.net >= 0 ? "moss" : "rust"}
          href="/finance"
        />
        <KpiTile label="Discover artists" value={artists} sub="verified vendors on the platform" tone="rust" href="/discover-artists" />
        <KpiTile label="Open tenders" value={tenders.open} sub={`${tenders.total} total tracked`} tone="gold" href="/discover-artists" />
        <KpiTile label="Experience guides" value={guides} sub="trip leaders & curators" tone="moss" href="/experience-guides" />
        <KpiTile label="Learn hosts · TTC · CSR" value={hosts} sub="potential apprenticeship hosts" tone="umber" href="/learn-hosts" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone/40 bg-parchment p-6">
          <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
            Spotlight · Karnataka
          </p>
          <h3 className="mt-1 font-display text-xl text-ink">
            The reference catalogue
          </h3>
          <p className="mt-3 font-body text-sm text-ink-soft">
            The first state to ship a complete catalogue end-to-end. Use it
            as the template for every other state.
          </p>
          <dl className="mt-5 space-y-2 font-body text-sm">
            <div className="flex justify-between border-b border-stone/30 pb-1">
              <dt className="text-umber">Traditions in catalogue</dt>
              <dd className="font-display text-ink">{karnatakaTraditions.length}</dd>
            </div>
            <div className="flex justify-between border-b border-stone/30 pb-1">
              <dt className="text-umber">Verified providers</dt>
              <dd className="font-display text-ink">{karnatakaProviders.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-umber">Festivals covered</dt>
              <dd className="font-display text-ink">{karnatakaFestivals.length}</dd>
            </div>
          </dl>
          <Link
            href="/cataloguing/karnataka"
            className="mt-5 inline-block rounded-full bg-forest px-4 py-2 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-clay"
          >
            Open Karnataka →
          </Link>
        </div>

        <div className="rounded-2xl border border-stone/40 bg-parchment p-6 lg:col-span-2">
          <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
            Recent catalogue jobs
          </p>
          <h3 className="mt-1 font-display text-xl text-ink">Render audit trail</h3>
          {recentJobs.length === 0 ? (
            <p className="mt-4 font-body text-sm text-ink-soft">
              No catalogues rendered yet — head to{" "}
              <Link href="/cataloguing" className="text-gold underline">
                Cataloguing
              </Link>{" "}
              to generate the first PDF.
            </p>
          ) : (
            <table className="mt-4 w-full font-body text-sm">
              <thead className="border-b border-stone/40 text-left text-[11px] uppercase tracking-wider text-umber">
                <tr>
                  <th className="py-2">State</th>
                  <th className="py-2">Generated</th>
                  <th className="py-2">By</th>
                  <th className="py-2 text-right">Size</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((j, i) => (
                  <tr key={i} className="border-b border-stone/20">
                    <td className="py-2 text-ink">{j.stateSlug}</td>
                    <td className="py-2 text-ink-soft">{new Date(j.generatedAt).toLocaleString()}</td>
                    <td className="py-2 text-ink-soft">{j.generatedBy}</td>
                    <td className="py-2 text-right text-ink-soft">{j.byteSize ? `${(j.byteSize / 1024).toFixed(0)} KB` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
              Marketing Calendar
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink">
              The chronology of Wriksh
            </h2>
            <p className="mt-2 max-w-xl font-body text-sm text-ink-soft">
              Posts, meetings, experiences, collabs, ads and app-dev — each
              coloured so the team can read a week at a glance.
            </p>
          </div>
          <Link
            href="/marketing"
            className="font-body text-xs uppercase tracking-[0.24em] text-gold hover:text-gold-bright"
          >
            Open calendar →
          </Link>
        </div>
        <div className="mt-5">
          <CalendarLegend counts={marketingCounts} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.28em] text-gold">
              Library
            </p>
            <h3 className="mt-1 font-display text-xl text-ink">
              {media} uploaded asset{media === 1 ? "" : "s"} + repo docs
            </h3>
            <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
              The unified Library holds every photo, video, document, audio
              file, and Markdown runbook the team uses — searchable by
              tag, bucket, or full-text query. Uploaded media lives in
              Vercel Blob; repo docs are git-tracked alongside the code.
            </p>
          </div>
          <Link
            href="/library"
            className="rounded-full bg-forest px-4 py-2 font-body text-xs uppercase tracking-[0.24em] text-linen hover:bg-clay"
          >
            Open Library →
          </Link>
        </div>
      </section>
    </div>
  );
}
