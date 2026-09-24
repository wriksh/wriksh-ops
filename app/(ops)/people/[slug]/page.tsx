import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonBySlug } from "@/lib/collections/people";
import { listRecentMarketingEvents } from "@/lib/collections/marketing";
import PersonDetail from "@/components/people/PersonDetail";

export default async function PersonDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const person = await getPersonBySlug(decodeURIComponent(params.slug));
  if (!person) return notFound();

  // Pull the last 20 marketing events so the detail page can surface
  // upcoming posts / meetings / campaigns tagged with this person.
  const events = await listRecentMarketingEvents(20);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/people"
        className="inline-block font-body text-xs uppercase tracking-[0.24em] text-gold hover:text-gold-bright"
      >
        ← People
      </Link>
      <PersonDetail person={person} events={events} />
    </div>
  );
}
