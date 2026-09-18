import Link from "next/link";
import {
  listEventsInRange,
  startOfMonth,
  endOfMonth,
  formatYmd,
} from "@/lib/collections/marketing";
import MarketingClient from "@/components/marketing/MarketingClient";

/**
 * /marketing — Phase 2 admin console.
 *
 * Server-fetches the current month's events, then hands off to the
 * client component for the calendar view + event CRUD.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const today = new Date();
  // ?month=YYYY-MM overrides default
  const requested = searchParams?.month;
  const monthDate = requested
    ? new Date(`${requested}-01T00:00:00Z`)
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const start = formatYmd(startOfMonth(monthDate));
  const end = formatYmd(endOfMonth(monthDate));
  const events = await listEventsInRange(start, end);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
            Phase 2  ·  Pillar of Time
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Marketing &amp; content calendar
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
            The chronology of Wriksh — past, present, and future posts,
            meetings, experiences, collabs, ads, and app-dev work, all
            colour-coded so the team can read a week at a glance.
          </p>
        </div>
        <Link
          href="/discord"
          className="rounded-full border border-gold px-4 py-2 font-body text-[11px] uppercase tracking-wider text-gold hover:bg-gold hover:text-linen"
        >
          Discord settings →
        </Link>
      </header>
      <MarketingClient
        monthDate={monthDate.toISOString()}
        events={events}
      />
    </div>
  );
}
