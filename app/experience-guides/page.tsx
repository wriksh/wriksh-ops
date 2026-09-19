import { permanentRedirect } from "next/navigation";

export default function ExperienceGuidesRedirect() {
  permanentRedirect("/people?role=guide");
}
