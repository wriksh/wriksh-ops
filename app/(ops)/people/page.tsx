import { listPeople, countPeopleByRole } from "@/lib/collections/people";
import PeopleClient from "@/components/people/PeopleClient";

/**
 * /people — unified People / Contacts database.
 *
 * Server-renders the list + role counts, hands off to the client for
 * filtering / searching / editing.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: { q?: string; role?: string; tag?: string; state?: string };
}) {
  const [all, counts] = await Promise.all([listPeople({ limit: 500 }), countPeopleByRole()]);

  return (
    <PeopleClient
      people={all}
      counts={counts}
      initialQuery={searchParams?.q ?? ""}
      initialRole={(searchParams?.role as never) ?? ""}
      initialTag={searchParams?.tag ?? ""}
      initialState={searchParams?.state ?? ""}
    />
  );
}
