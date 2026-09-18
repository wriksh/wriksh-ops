import { listExperienceGuides } from "@/lib/collections/experienceGuides";
import ExperienceGuidesClient from "@/components/guides/ExperienceGuidesClient";

export default async function ExperienceGuidesPage() {
  const guides = await listExperienceGuides();
  return <ExperienceGuidesClient initialGuides={guides} />;
}
