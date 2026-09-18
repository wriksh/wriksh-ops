import ComingSoon from "@/components/ComingSoon";

export default function ExperienceGuidesPage() {
  return (
    <ComingSoon
      title="Experience Guides · Energy"
      phase="Phase 6a"
      pillar="Energy"
      description="Local guides, curators, and trip leaders who can lead a Wriksh Experience in their home state. The catalogue of people, places, and recommendations that turns a verified tradition into a bookable journey."
      bullets={[
        "Per-guide profile with languages, certifications, and rating",
        "Free-form list of experiences the guide can lead",
        "Per-state discovery + city-level filtering",
        "Connects to wriksh-dev's `experiences` collection for live inventory",
      ]}
    />
  );
}
