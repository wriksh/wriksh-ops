import { listDiscoverArtists, listTenders } from "@/lib/collections/artists";
import DiscoverArtistsClient from "@/components/artists/DiscoverArtistsClient";

export default async function DiscoverArtistsPage() {
  const [artists, tenders] = await Promise.all([
    listDiscoverArtists(),
    listTenders(),
  ]);
  return (
    <DiscoverArtistsClient
      artists={artists}
      tenders={tenders}
    />
  );
}
