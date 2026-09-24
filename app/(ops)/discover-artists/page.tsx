import { permanentRedirect } from "next/navigation";

export default function DiscoverArtistsRedirect() {
  permanentRedirect("/people?role=artist");
}
